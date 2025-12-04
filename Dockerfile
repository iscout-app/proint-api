FROM oven/bun:alpine AS base
WORKDIR /usr/src/app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run build

USER bun
EXPOSE 3000/tcp
