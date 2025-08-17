# intmax2-claim-aggregator

The claim aggregator is responsible for consolidating claims and managing requests to the ZKP (Zero-Knowledge Proof).

## Setup

Before running any service, make sure to:

```sh
# Install dependencies
yarn

# Copy environment variables
cp .env.example .env

# Build shared packages
yarn build:shared
```

## Development

Start the processor or job service in development mode:

```sh
# collector
yarn workspace collector dev

# processor
yarn workspace processor dev

# watcher
yarn workspace watcher dev

# dispatcher
yarn workspace dispatcher dev

# reward
yarn workspace reward dev
```

## Migration

```sh
# create db
docker exec -it intmax2-claim-aggregator-postgres psql -U postgres -d maindb
CREATE DATABASE event;
CREATE DATABASE withdrawal;

# migration
yarn generate:event
yarn migrate:event

# migration(local only)
yarn generate:withdrawal
yarn migrate:withdrawal
```

## Docker

```sh
# db, redis
docker compose -f ./docker-compose.yml up postgres redis -d

# redis
docker compose -f ./docker-compose.yml up redis -d

# postgres
docker compose -f ./docker-compose.yml up postgres -d

# all reset
docker compose down -v

# build and run
docker build -f docker/Dockerfile -t intmax2-claim-aggregator .
docker run --rm -p 3000:3000 --env-file .env intmax2-claim-aggregator workspace collector start
```

## Redis

Run Redis in a Docker container with data persistence enabled.

```sh
docker run -d --rm \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis redis-server --appendonly yes
```

## Docs

This document explains the overall system design of claim-aggregator. It covers the architectural components, interactions between modules, data flow, and the process of generating and verifying ZKPs (Zero-Knowledge Proofs). It is intended to help developers and infrastructure engineers understand the technical foundation of the system.

- [SYSTEM Design](./docs/SYSTEM_DESIGN.md)
- [ENV](./packages/shared/src/config/index.ts) 