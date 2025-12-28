#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-TextReaderEcrStack}"
TAG="${1:-latest}"
PLATFORM="${2:-linux/arm64}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

if [[ -z "$REGION" ]]; then
  echo "AWS_REGION or AWS_DEFAULT_REGION is required."
  exit 1
fi

REPO_URI="$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendRepositoryUri'].OutputValue" \
  --output text)"

if [[ -z "$REPO_URI" || "$REPO_URI" == "None" ]]; then
  echo "Failed to resolve ECR repository URI from stack: $STACK_NAME"
  exit 1
fi

ACCOUNT_ID="${REPO_URI%%.*}"

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

docker build --platform "$PLATFORM" -t "$REPO_URI:$TAG" .

docker push "$REPO_URI:$TAG"

echo "Pushed $REPO_URI:$TAG"
