# intmax2-claim-aggregator

The claim aggregator is responsible for consolidating claims and managing requests to the ZKP (Zero-Knowledge Proof).

## Development

```sh
# install
yarn

# env
cp .env.example .env

# generate
yarn generate

# shared build
yarn build:shared

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
# migrate dev
yarn migrate

# migrate prod
yarn migrate:deploy

# reset
yarn reset
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
