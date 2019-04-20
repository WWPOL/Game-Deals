.PHONY: db

CONTAINER_DATA ?= container-data
DB_DATA ?= ${CONTAINER_DATA}/postgres

DB_CONTAINER ?= postgres
DB_CONTAINER_NAME ?= game-deals-postgres

# db starts a local PostgreSQL database
db:
	mkdir -p "${DB_DATA}"
	docker run \
		-it \
		--rm \
		--net host \
		--name ${DB_CONTAINER_NAME} \
		-v "${PWD}/${DB_DATA}:/var/lib/postgresql/data" \
		${DB_CONTAINER}
