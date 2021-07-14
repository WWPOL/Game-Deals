#!/usr/bin/env bash
set -x
docker-compose up -d
docker-compose logs -f frontenddev backenddev nginxdev
