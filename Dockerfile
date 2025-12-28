FROM public.ecr.aws/docker/library/node:24-slim AS deps
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM public.ecr.aws/docker/library/node:24-slim AS build
WORKDIR /app

RUN corepack enable
COPY --from=deps /app/node_modules /app/node_modules
COPY package.json pnpm-lock.yaml ./
COPY . .
RUN pnpm build
RUN CI=true pnpm prune --prod

FROM public.ecr.aws/docker/library/node:24-slim AS runtime
WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV AWS_LWA_PORT=3000

EXPOSE 3000

CMD ["node", "build"]
