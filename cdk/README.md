# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `pnpm run build`   compile typescript to js
* `pnpm run watch`   watch for changes and compile
* `pnpm run test`    perform the jest unit tests
* `pnpm cdk deploy`  deploy all stacks to your default AWS account/region
* `pnpm cdk diff`    compare deployed stack with current state
* `pnpm cdk synth`   emits the synthesized CloudFormation template

## Stacks

- `TextReaderEcrStack`: ECR repository for the frontend container image
- `TextReaderStack`: main app resources (S3/DynamoDB/Lambda/SNS/CloudFront)

## Deployment flow

1. Deploy the ECR stack:
   - `pnpm cdk deploy TextReaderEcrStack`
2. Build and push the frontend image to ECR (tag as needed).
3. Deploy the app stack with the image tag:
   - `pnpm cdk deploy TextReaderStack -c frontendImageTag=latest`
   - `FRONTEND_IMAGE_TAG=2024-09-01 pnpm deploy:app`
   - `FRONTEND_IMAGE_TAG=2024-09-01 pnpm deploy:all`
