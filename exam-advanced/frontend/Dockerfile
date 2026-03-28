FROM node:24-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

ENV CI=true

RUN pnpm install --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "dev"]
