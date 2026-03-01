# ── Railway Deployment ─────────────────────────────────────
# Python-only image. frontend/build/ is pre-built and committed to git,
# so no Node.js is needed at deploy time.
# ──────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# Install Python deps first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy full application
COPY . .

# Railway injects PORT env var at runtime
ENV PORT=5000
EXPOSE 5000

# Shell form so $PORT is expanded at runtime
CMD gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120 --preload
