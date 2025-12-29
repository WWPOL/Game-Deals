FROM python:3.13-alpine

WORKDIR /app

# Install build dependencies for PostgreSQL adapter
RUN apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev

# Copy dependency files and package structure
COPY pyproject.toml README.md ./
COPY game_deals/ ./game_deals/

# Install Python dependencies
RUN pip install --no-cache-dir -e '.[dev]'

# Source code will be mounted via docker-compose

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
