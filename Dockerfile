FROM python:3.13-alpine

# Build args for user
ARG UID=1000
ARG GID=1000

WORKDIR /app

# Install build dependencies for PostgreSQL adapter and production needs
RUN apk add --no-cache \
    gcc g++ \
    musl-dev \
    postgresql-dev \
    shadow \
    curl

# Create non-root user with matching UID/GID
RUN groupadd -g ${GID} appuser && \
    useradd -m -u ${UID} -g appuser appuser

# Copy requirements files
COPY requirements.txt ./

# Install Python dependencies as root (production requirements only)
RUN pip install --no-cache-dir -r requirements.txt

# Make the entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Change ownership of app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Copy application code
COPY --chown=appuser:appuser . .

# Collect static files (if needed)
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]