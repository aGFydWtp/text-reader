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

### Custom Domain (text-reader.app.hr20k.com)

CloudFront and Cognito custom domains require the ACM certificate in us-east-1. The
`deploy:acm` command creates both certificates in separate stacks.

Recommended order and example commands:

1) ECR
```sh
pnpm -C cdk deploy:ecr
```

2) ACM (CloudFront + Cognito, both in us-east-1)
```sh
pnpm -C cdk deploy:acm \
  -c hostedZoneId=Z1234567890 \
  -c hostedZoneName=app.hr20k.com \
  -c customSubdomain=text-reader \
  -c cognitoSubdomain=auth.text-reader
```

3) App stack (use the ARNs from step 2)
```sh
FRONTEND_IMAGE_TAG=latest pnpm -C cdk deploy:app \
  -c hostedZoneId=Z1234567890 \
  -c hostedZoneName=app.hr20k.com \
  -c customSubdomain=text-reader \
  -c certificateArn=arn:aws:acm:us-east-1:... \
  -c cognitoDomainName=auth.text-reader.app.hr20k.com \
  -c cognitoCertificateArn=arn:aws:acm:us-east-1:...
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
