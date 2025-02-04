FROM node:22.13.0-bookworm-slim AS builder

RUN corepack enable && \
    corepack prepare yarn@4.6.0 --activate && \
    yarn set version 4.6.0

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/*/package.json ./packages/
COPY . .

RUN yarn install --immutable
RUN yarn generate
RUN yarn build

FROM node:22.13.0-bookworm-slim

RUN corepack enable && \
    corepack prepare yarn@4.6.0 --activate && \
    yarn set version 4.6.0

RUN apt-get update -y && apt-get install -y openssl

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma

RUN yarn install --immutable
RUN yarn generate

EXPOSE $PORT
ENTRYPOINT ["yarn"]