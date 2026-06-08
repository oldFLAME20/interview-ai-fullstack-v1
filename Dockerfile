FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

WORKDIR /usr/src/node-app

COPY --chown=node:node package.json pnpm-lock.yaml ./

USER node

RUN pnpm install --frozen-lockfile --prod

COPY --chown=node:node . .

EXPOSE 3000

CMD ["pnpm", "start"]
