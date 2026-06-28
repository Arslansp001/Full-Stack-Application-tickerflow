# ── Stage 1: dependency builder ───────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# System deps for psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into a local prefix (keeps stage 2 clean)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime image ────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Runtime system lib for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Non-root user for security
RUN addgroup --system appgroup && \
    adduser  --system --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

# ── Environment defaults (override via --env-file or -e flags) ────────────
ENV FLASK_ENV=production \
    FLASK_DEBUG=0 \
    PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

# Gunicorn: 2-4 workers, sync worker class (swap to gevent for high concurrency)
CMD ["gunicorn", \
     "--bind",       "0.0.0.0:5000", \
     "--workers",    "3", \
     "--timeout",    "60", \
     "--access-logfile", "-", \
     "--error-logfile",  "-", \
     "wsgi:app"]
