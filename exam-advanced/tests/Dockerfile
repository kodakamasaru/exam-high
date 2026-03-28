FROM mcr.microsoft.com/playwright:v1.58.2-noble

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json ./

ENV CI=true

RUN pnpm install

COPY . .
