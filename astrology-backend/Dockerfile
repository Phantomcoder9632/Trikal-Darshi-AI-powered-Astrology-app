FROM python:3.11-slim

# Install system dependencies needed for compiling C modules (Swiss Ephemeris)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set up write access permissions for Hugging Face home directory caching
RUN mkdir -p /.cache && chmod -R 777 /.cache

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY . .

# Hugging Face runs containers on port 7860
EXPOSE 7860

# Bind Uvicorn to port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
