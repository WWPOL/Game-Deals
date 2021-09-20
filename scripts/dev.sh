#!/usr/bin/env bash
set -x
docker-compose restart backend
docker-compose up -d
docker-compose logs -f --tail=20 frontend backend
