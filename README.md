# intmax2-claim-aggregator

The withdrawal aggregator is responsible for consolidating withdrawals and managing requests to the ZKP (Zero-Knowledge Proof).

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
```

## Migration

```sh
# migrate dev
yarn migrate

# deploy
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
```
