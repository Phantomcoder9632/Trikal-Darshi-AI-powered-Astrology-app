import os
import re
import uuid
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt
import httpx

from db.database import get_db
from services.security import RateLimiter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
# Mobile apps mint ID tokens for an Android-type OAuth client (custom-scheme
# redirect). Accept both audiences so the website and the APK share one login
# endpoint. Configure GOOGLE_ANDROID_CLIENT_ID in the Space env vars.
GOOGLE_ANDROID_CLIENT_ID = os.getenv("GOOGLE_ANDROID_CLIENT_ID")
GOOGLE_CLIENT_IDS = [c for c in (GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID) if c]
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# OWASP 2024 guidance: PBKDF2-HMAC-SHA256 should use >= 600,000 iterations.
# Legacy hashes with fewer iterations still verify and are upgraded on login.
PBKDF2_ITERATIONS = 600000

# Pre-computed dummy hash used to equalize timing when an account does not exist.
DUMMY_HASH = "pbkdf2_sha256$600000$0123456789abcdef0123456789abcdef$" + "0" * 64

security = HTTPBearer(auto_error=False)

class GoogleLoginPayload(BaseModel):
    token: str
    language: Optional[str] = "english"

class EmailLoginPayload(BaseModel):
    email: EmailStr
    password: str

class EmailRegisterPayload(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    language: Optional[str] = "english"

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    preferred_language: Optional[str] = "english"

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


def normalize_language(lang: Optional[str]) -> str:
    """
    Normalize language input to one of the supported backend values.
    Accepts full names ('english', 'hindi', 'bengali') or
    ISO codes ('en', 'hi', 'bn') and returns the full lowercase name.
    Defaults to 'english' for unknown/None values.
    """
    if not lang:
        return "english"
    lang = lang.lower().strip()
    mapping = {
        "en": "english", "english": "english",
        "hi": "hindi",   "hindi": "hindi",
        "bn": "bengali", "bengali": "bengali",
    }
    return mapping.get(lang, "english")

def create_access_token(user_id: uuid.UUID, email: str) -> str:
    """
    Generate a signed JWT access token for local session management.
    Includes iat/jti claims; requires JWT_SECRET >= 32 chars.
    """
    now = datetime.utcnow()
    payload = {
        "user_id": str(user_id),
        "email": email,
        "iat": now,
        "jti": secrets.token_hex(16),
        "exp": now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    conn = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency to require authentication on a route.
    """
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET is not configured on the backend."
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing."
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id_str = payload.get("user_id")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is invalid."
            )
        
        user_uuid = uuid.UUID(user_id_str)
        row = await conn.fetchrow(
            "SELECT id, email, name, picture FROM users WHERE id = $1",
            user_uuid
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user record not found."
            )
        return dict(row)
    except jwt.PyJWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token."
        )
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed."
        )


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    conn = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Dependency to optionally verify user credentials.
    Returns User dictionary if authenticated, or None if guest.
    """
    if not JWT_SECRET or not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id_str = payload.get("user_id")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is invalid."
            )
        
        user_uuid = uuid.UUID(user_id_str)
        row = await conn.fetchrow(
            "SELECT id, email, name, picture, preferred_language FROM users WHERE id = $1",
            user_uuid
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user record not found."
            )
        return dict(row)
    except jwt.PyJWTError as e:
        logger.warning(f"Optional JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error authenticating optional user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed."
        )


@router.post("/auth/google", response_model=LoginResponse)
async def google_login(payload: GoogleLoginPayload, conn = Depends(get_db)):
    """
    Verify Google token (ID token or access token) and upsert user, returning a local session token.
    Supports both the credential (ID token) flow and the implicit access-token flow
    (used by useGoogleLogin on mobile to avoid the GSI One Tap redirect freeze).
    """
    if not GOOGLE_CLIENT_ID:
        logger.error("GOOGLE_CLIENT_ID env variable is not set")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID is not configured on the server."
        )

    google_id = email = name = picture = None

    # ── Strategy 1: Try verifying as a JWT ID token ──────────────────────────
    try:
        idinfo = None
        last_err: Exception | None = None
        for audience in GOOGLE_CLIENT_IDS:
            try:
                idinfo = id_token.verify_oauth2_token(
                    payload.token,
                    requests.Request(),
                    audience
                )
                break
            except Exception as aud_err:
                last_err = aud_err
                continue
        if idinfo is None:
            raise last_err or ValueError("no configured Google client audience matched")
        google_id = idinfo["sub"]
        email     = idinfo["email"]
        name      = idinfo.get("name", "")
        picture   = idinfo.get("picture", "")
        logger.info(f"Verified Google ID token for: {email}")
    except Exception as id_token_err:
        logger.info(f"Not a valid ID token ({type(id_token_err).__name__}), trying as access token…")

    # ── Strategy 2: Try verifying as an OAuth access token via userinfo ───────
    if email is None:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {payload.token}"},
                )
            if resp.status_code != 200:
                raise ValueError(f"Google userinfo returned {resp.status_code}: {resp.text}")
            info = resp.json()
            google_id = info.get("sub")
            email     = info.get("email")
            name      = info.get("name", "")
            picture   = info.get("picture", "")
            if not email:
                raise ValueError("Google userinfo response missing email")
            logger.info(f"Verified Google access token for: {email}")
        except Exception as access_err:
            logger.warning(f"Google access token verification also failed: {type(access_err).__name__}: {access_err}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google token verification failed: {str(access_err)}"
            )

    try:
        # Check if user already exists
        row = await conn.fetchrow(
            "SELECT id, name, picture FROM users WHERE email = $1",
            email
        )

        if row:
            user_id = row["id"]
            if row["name"] != name or row["picture"] != picture:
                await conn.execute(
                    "UPDATE users SET name = $1, picture = $2, google_id = $3 WHERE id = $4",
                    name, picture, google_id, user_id
                )
                logger.info(f"Updated user profile for: {email}")
        else:
            user_id = uuid.uuid4()
            preferred_lang = normalize_language(payload.language)
            await conn.execute(
                """
                INSERT INTO users (id, google_id, email, name, picture, preferred_language)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                user_id, google_id, email, name, picture, preferred_lang
            )
            logger.info(f"Created new user record for: {email}")

        access_token = create_access_token(user_id, email)

        # Fetch preferred_language from DB
        user_row = await conn.fetchrow(
            "SELECT preferred_language FROM users WHERE id = $1", user_id
        )
        preferred_language = (user_row["preferred_language"] if user_row else None) or "english"

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "preferred_language": preferred_language
            }
        }

    except Exception as e:
        logger.error(f"Unexpected authentication failure: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal login error: {type(e).__name__}: {str(e)}"
        )


def hash_password(password: str) -> str:
    """
    Generates a secure PBKDF2 hash of the password using hashlib.
    600,000 iterations (OWASP 2024 guidance for PBKDF2-HMAC-SHA256).
    Existing 100k hashes still verify (iteration count is stored per-hash)
    and are transparently re-hashed on next successful login.
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a password against the stored PBKDF2 hash.
    """
    try:
        parts = hashed.split('$')
        if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
            return False
        iterations = int(parts[1])
        salt = parts[2]
        old_key = parts[3]
        new_key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        return secrets.compare_digest(new_key.hex(), old_key)
    except Exception:
        return False


@router.post("/auth/register", response_model=LoginResponse, dependencies=[Depends(RateLimiter("auth", limit=5))])
async def email_register(payload: EmailRegisterPayload, conn = Depends(get_db)):
    """
    Register a new user using email and password.
    """
    email = payload.email.lower().strip()
    password = payload.password
    name = payload.name.strip() if payload.name else None

    # Password complexity policy: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
    PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
    if not re.match(PASSWORD_REGEX, password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number."
        )

    # Check if user already exists
    existing = await conn.fetchrow(
        "SELECT id FROM users WHERE email = $1",
        email
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address is already registered."
        )

    user_id = uuid.uuid4()
    google_id = f"email_{user_id}"
    pwd_hash = hash_password(password)
    preferred_lang = normalize_language(payload.language)

    try:
        await conn.execute(
            """
            INSERT INTO users (id, google_id, email, name, password_hash, preferred_language)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            user_id, google_id, email, name, pwd_hash, preferred_lang
        )
        logger.info(f"Created new email user record for: {email}")
    except Exception as e:
        logger.error(f"Error registering new user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create user account. Please try again."
        )

    access_token = create_access_token(user_id, email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "picture": None,
            "preferred_language": preferred_lang
        }
    }


@router.post("/auth/login", response_model=LoginResponse, dependencies=[Depends(RateLimiter("auth", limit=5))])
async def email_login(payload: EmailLoginPayload, conn = Depends(get_db)):
    """
    Log in an existing user using email and password.
    """
    email = payload.email.lower().strip()
    password = payload.password

    row = await conn.fetchrow(
        "SELECT id, email, name, picture, password_hash, preferred_language FROM users WHERE email = $1",
        email
    )

    if not row or not row["password_hash"]:
        # Burn comparable CPU time so 'user not found' is indistinguishable
        verify_password(password, DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = row["id"]

    # Transparent hash upgrade for legacy password hashes
    if f"pbkdf2_sha256${PBKDF2_ITERATIONS}$" not in row["password_hash"]:
        try:
            await conn.execute(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                hash_password(password),
                user_id,
            )
            logger.info(f"Upgraded password hash strength for user {user_id}")
        except Exception as upgrade_err:
            logger.warning(f"Could not upgrade password hash for {user_id}: {upgrade_err}")

    access_token = create_access_token(user_id, email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": row["email"],
            "name": row["name"],
            "picture": row["picture"],
            "preferred_language": row["preferred_language"] or "english"
        }
    }

