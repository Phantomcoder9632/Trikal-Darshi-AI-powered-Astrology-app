# 100% Free Premium Spec Deployment Guide: Trikal Darshi (v1.0.0)

Since this application loads a HuggingFace embedding model (`all-MiniLM-L6-v2`) and runs ChromaDB, it requires a minimum of **1GB RAM** (ideally 1.5GB - 2GB) and a persistent process for background calculations. Standard free tiers like Render or Fly.io (limited to 256MB–512MB RAM) will crash.

Below is the ultimate guide to deploying this full-stack project **100% free** using platforms that offer premium, high-memory specifications.

---

## 1. Summary of 100% Free Hosting Specs

| Layer | Recommended Free Platform | Hardware Specs (Free) | Key Advantage |
| :--- | :--- | :--- | :--- |
| **Backend API** | **Hugging Face Spaces** (Docker) | **16 GB RAM**<br>2 vCPUs<br>50 GB Storage | Massive memory headroom for PyTorch & ChromaDB. Runs 24/7. |
| *Alternative Backend* | **Oracle Cloud Always Free** | **24 GB RAM**<br>4 ARM vCPUs<br>200 GB SSD Storage | A full virtual private server (VPS) with outstanding specs. |
| **Frontend UI** | **Vercel** | Edge Network CDN | Generous bandwidth, automatic CI/CD from Git. |
| **PostgreSQL** | **Supabase** or **Neon.tech** | 500 MB (Supabase)<br>3 GB (Neon) | Dedicated managed SQL instance. |
| **Redis Cache** | **Upstash** | 10,000 requests/day | Serverless Redis, zero-maintenance. |

---

## 2. Option A: Hugging Face Spaces (Docker Setup) — Recommended

Hugging Face Spaces is a platform designed to host machine learning demos, but since it supports custom **Docker containers**, you can run any FastAPI application. They provide a **16GB RAM, 2 vCPU CPU Basic instance completely free**.

### Architectural Flow:
```
[User Browser] ──> Vercel (Frontend UI)
                       │
                       └──(API requests)──> Hugging Face Space (FastAPI Docker Container)
                                                    │
                                                    ├──> Supabase (PostgreSQL)
                                                    └──> Upstash (Redis)
```

### Setup Steps for the Backend on Hugging Face:

1. **Create a Hugging Face Account:** Sign up at [huggingface.co](https://huggingface.co).
2. **Create a New Space:**
   * Go to `Spaces` -> `Create new Space`.
   * Name your space (e.g., `trikal-darshi-api`).
   * Select **Docker** as the SDK.
   * Select **Blank** (or FastAPI) as the template.
   * Choose **CPU basic (Free, 16GB RAM, 2 vCPU)**.
   * Set Space visibility to **Public** (the code repository will be visible, but your API keys and connection strings will be hidden in Secrets).
3. **Configure the Space's Environment Variables (Secrets):**
   * In your Space, go to the **Settings** tab.
   * Under **Variables and secrets**, click **New secret** for each of the following:
     * `DATABASE_URL`: `postgresql://postgres:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres` (from Supabase/Neon)
     * `REDIS_URL`: `redis://default:[password]@your-upstash-redis.upstash.io:6379` (from Upstash)
     * `GEMINI_API_KEY`: `AIzaSy...`
     * `OPENROUTER_API_KEY`: `sk-or-v1-...`
     * `ASTROLOGYAPI_USER_ID`: `653870`
     * `ASTROLOGYAPI_API_KEY`: `ak-5f8e...`
     * `CORS_ORIGINS`: `https://your-vercel-app.vercel.app` (your frontend domain)
     * `APP_ENV`: `production`
4. **Deploy the Code to Hugging Face:**
   * Hugging Face Spaces act as a remote Git repository. You can either link it to GitHub or push directly to the Hugging Face remote.
   * Ensure your backend has the `Dockerfile` shown below.

### Backend `Dockerfile` (Hugging Face Compatible)
Create this file in [astrology-backend/Dockerfile](file:///d:/AstrologyApp/astrology-backend/Dockerfile). Hugging Face requires the container to bind to port **`7860`**:

```dockerfile
FROM python:3.11-slim

# Install system dependencies needed for compiling C modules (Swiss Ephemeris)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set up write access permissions for Hugging Face home dir
RUN mkdir -p /.cache && chmod -R 777 /.cache

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Hugging Face runs containers on port 7860
EXPOSE 7860

# CMD binds to 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### Keeping the Space Awake (Free Cron)
* **Idle Sleep:** Hugging Face Spaces automatically go to sleep after 48 hours of inactivity.
* **Solution:** Create a free account on [UptimeRobot](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org) and set up an HTTP check that pings your Hugging Face Space health check endpoint (`https://huggingface.co/spaces/[your-username]/[your-space-name]/health` or your direct app URL `/health`) **once every 20 minutes**. This prevents the Space from ever sleeping and keeps it online 24/7!

---

## 3. Option B: Oracle Cloud Always Free (Full VPS Setup)

Oracle Cloud offers the most generous free VPS program in the world. However, creating an account requires a credit card validation, and registration can sometimes fail due to their strict fraud filter. If you manage to register, you can get a virtual server with unmatched free specs.

### Step-by-Step setup:
1. **Sign Up:** Register for an **Oracle Cloud Infrastructure (OCI) Always Free** account.
2. **Launch Instance:** Create a Compute instance selecting the **Ampere VM.Standard.A1.Flex** shape. Allocate:
   * **4 OCPUs (ARM Processors)**
   * **24 GB RAM**
   * **Ubuntu OS** (22.04 LTS or newer)
3. **Open Ports in OCI Console:**
   * Go to your Virtual Cloud Network (VCN) -> Security Lists.
   * Add an **Ingress Rule** to allow TCP traffic on port `80` (HTTP) and `443` (HTTPS) from any IP (`0.0.0.0/0`).
4. **SSH into the VPS and Setup Docker Compose:**
   * Update the packages and install Docker:
     ```bash
     sudo apt update && sudo apt install -y docker.io docker-compose
     ```
   * Open the OS firewall ports (Ubuntu on Oracle Cloud has iptables rules that block ports by default):
     ```bash
     sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
     sudo netfilter-persistent save
     ```
   * Deploy using the [docker-compose.yml](file:///d:/AstrologyApp/docker-compose.yml) blueprint (shown in the previous guide), and run:
     ```bash
     sudo docker-compose up -d --build
     ```

---

## 4. Setting up Free Databases

To keep your deployment 100% free, combine your backend server with these free database providers:

### 1. PostgreSQL (Supabase)
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Under **Project Settings** -> **Database**, copy the **Transaction Connection String** (URI format).
3. The host will look like: `aws-0-us-east-1.pooler.supabase.com`.
4. Ensure you append `?sslmode=require` to your `DATABASE_URL` to secure the connection.

### 2. Redis (Upstash)
1. Go to [upstash.com](https://upstash.com) and create a free serverless Redis database.
2. Select the region closest to your Hugging Face Space (usually US East or EU West).
3. Copy the Redis connection URL (e.g., `redis://default:password@name.upstash.io:6379`).

---

## 5. Setting up Free Frontend (Vercel)

1. Push your code repository to **GitHub**.
2. Log into [Vercel](https://vercel.com) using your GitHub account.
3. Click **Add New** -> **Project** and select your `Trikal-Darshi` repository.
4. Set the root directory of the deployment to `astrology-frontend` (Vite will be automatically auto-configured).
5. In **Environment Variables**, add:
   * **`VITE_API_URL`**: Set this to your Hugging Face Space direct embed URL (e.g., `https://[username]-[space-name].hf.space` — you can get this direct URL by clicking the three dots at the top right of your Hugging Face Space page and choosing "Embed the Space").
6. Click **Deploy**. Your frontend is now online with free CDN caching and SSL.
