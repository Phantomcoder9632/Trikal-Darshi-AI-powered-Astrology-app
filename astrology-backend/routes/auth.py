import os
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

from db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)

class GoogleLoginPayload(BaseModel):
    token: str

class EmailLoginPayload(BaseModel):
    email: EmailStr
    password: str

class EmailRegisterPayload(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


def create_access_token(user_id: uuid.UUID, email: str) -> str:
    """
    Generate a signed JWT access token for local session management.
    """
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "user_id": str(user_id),
        "email": email,
        "exp": expire
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
    Verify Google ID token, upsert user record, and return local session token.
    """
    if not GOOGLE_CLIENT_ID:
        logger.error("GOOGLE_CLIENT_ID env variable is not set")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID is not configured on the server."
        )

    try:
        # Verify the ID token against Google OAuth endpoints
        idinfo = id_token.verify_oauth2_token(
            payload.token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Extract user profile parameters
        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name", "")
        picture = idinfo.get("picture", "")

        # Check if user already exists
        row = await conn.fetchrow(
            "SELECT id, name, picture FROM users WHERE email = $1",
            email
        )

        if row:
            user_id = row["id"]
            # If name or picture changed on Google, update it
            if row["name"] != name or row["picture"] != picture:
                await conn.execute(
                    "UPDATE users SET name = $1, picture = $2, google_id = $3 WHERE id = $4",
                    name, picture, google_id, user_id
                )
                logger.info(f"Updated user profile for: {email}")
        else:
            # Create a brand new user record
            user_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO users (id, google_id, email, name, picture)
                VALUES ($1, $2, $3, $4, $5)
                """,
                user_id, google_id, email, name, picture
            )
            logger.info(f"Created new user record for: {email}")

        # Generate local session access token
        access_token = create_access_token(user_id, email)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "picture": picture
            }
        }

    except ValueError as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authentication token could not be verified."
        )
    except Exception as e:
        logger.error(f"Unexpected authentication failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal login error occurred."
        )


def hash_password(password: str) -> str:
    """
    Generates a secure PBKDF2 hash of the password using hashlib.
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"pbkdf2_sha256$100000${salt}${key.hex()}"


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


@router.post("/auth/register", response_model=LoginResponse)
async def email_register(payload: EmailRegisterPayload, conn = Depends(get_db)):
    """
    Register a new user using email and password.
    """
    email = payload.email.lower().strip()
    password = payload.password
    name = payload.name.strip() if payload.name else None

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
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

    try:
        await conn.execute(
            """
            INSERT INTO users (id, google_id, email, name, password_hash)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id, google_id, email, name, pwd_hash
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
            "picture": None
        }
    }


@router.post("/auth/login", response_model=LoginResponse)
async def email_login(payload: EmailLoginPayload, conn = Depends(get_db)):
    """
    Log in an existing user using email and password.
    """
    email = payload.email.lower().strip()
    password = payload.password

    row = await conn.fetchrow(
        "SELECT id, email, name, picture, password_hash FROM users WHERE email = $1",
        email
    )

    if not row or not row["password_hash"]:
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
    access_token = create_access_token(user_id, email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": row["email"],
            "name": row["name"],
            "picture": row["picture"]
        }
    }

