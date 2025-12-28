# Text Reader

SvelteKit (SSR) frontend + AWS CDK infrastructure workspace.

## Getting Started

```sh
pnpm install
pnpm dev
```

## Workspace Layout

- `src/`, `static/`: SvelteKit frontend
- `cdk/`: AWS CDK (TypeScript) and backend Lambda handlers

## CDK Deploy

Deploy ECR first, then the app stack with a frontend image tag:

```sh
pnpm -C cdk deploy:ecr
FRONTEND_IMAGE_TAG=latest pnpm -C cdk deploy:app
```

Deploy both in one command:

```sh
FRONTEND_IMAGE_TAG=latest pnpm -C cdk deploy:all
```

## Push frontend image to ECR

The script resolves the ECR URI from the `TextReaderEcrStack` outputs.

```sh
AWS_REGION=ap-northeast-1 ./scripts/push-frontend-image.sh
AWS_REGION=ap-northeast-1 ./scripts/push-frontend-image.sh 2024-09-01
AWS_REGION=ap-northeast-1 STACK_NAME=TextReaderEcrStack ./scripts/push-frontend-image.sh 2024-09-01 linux/arm64
```
