FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

RUN mkdir -p /usr/src/frontend && chown -R node:node /usr/src/frontend

WORKDIR /usr/src/frontend

COPY --chown=node:node package.json pnpm-lock.yaml ./

USER node

RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3000
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

RUN pnpm build

EXPOSE 3001

CMD ["pnpm", "start"]
