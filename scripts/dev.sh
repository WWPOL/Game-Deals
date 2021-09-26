#!/usr/bin/env bash
set -x
docker-compose up -d
docker-compose logs -f --tail=20 frontend backend
