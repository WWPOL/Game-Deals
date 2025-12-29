FROM python:3.13-alpine

# Build args for user
ARG UID=1000
ARG GID=1000

WORKDIR /app

# Install build dependencies for PostgreSQL adapter
RUN apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    shadow

# Create non-root user with matching UID/GID
RUN groupadd -g ${GID} appuser && \
    useradd -m -u ${UID} -g appuser appuser

# Copy requirements files
COPY requirements.txt requirements-dev.txt ./

# Install Python dependencies as root
RUN pip install --no-cache-dir -r requirements-dev.txt

# Change ownership of app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Source code will be mounted via docker-compose

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
