#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TextReaderStack } from '../lib/cdk-stack';
import { EcrStack } from '../lib/ecr-stack';
import { TextReaderCloudFrontAcmStack, TextReaderCognitoAcmStack } from '../lib/acm-stack';

const app = new cdk.App();
const frontendImageTag = app.node.tryGetContext('frontendImageTag') ?? 'latest';
const hostedZoneId = app.node.tryGetContext('hostedZoneId');
const hostedZoneName = app.node.tryGetContext('hostedZoneName');
const customSubdomain = app.node.tryGetContext('customSubdomain') ?? 'text-reader';
const cognitoSubdomain = app.node.tryGetContext('cognitoSubdomain') ?? `auth.${customSubdomain}`;
const certificateArn = app.node.tryGetContext('certificateArn');
const cognitoDomainName = app.node.tryGetContext('cognitoDomainName');
const cognitoCertificateArn = app.node.tryGetContext('cognitoCertificateArn');

if (hostedZoneId && hostedZoneName) {
  new TextReaderCloudFrontAcmStack(app, 'TextReaderCloudFrontAcmStack', {
    hostedZoneId,
    hostedZoneName,
    subdomain: customSubdomain,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'us-east-1',
    },
  });

  new TextReaderCognitoAcmStack(app, 'TextReaderCognitoAcmStack', {
    hostedZoneId,
    hostedZoneName,
    subdomain: cognitoSubdomain,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'us-east-1',
    },
  });
}

const customDomain =
  hostedZoneId && hostedZoneName && certificateArn
    ? {
        hostedZoneId,
        hostedZoneName,
        domainName: `${customSubdomain}.${hostedZoneName}`,
        certificateArn,
        recordName: customSubdomain,
      }
    : undefined;

const cognitoCustomDomain =
  cognitoDomainName && cognitoCertificateArn
    ? {
        domainName: cognitoDomainName,
        certificateArn: cognitoCertificateArn,
      }
    : undefined;

const ecrStack = new EcrStack(app, 'TextReaderEcrStack');
const appStack = new TextReaderStack(app, 'TextReaderStack', {
  frontendRepository: ecrStack.frontendRepository,
  frontendImageTag,
  customDomain,
  cognitoCustomDomain,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

cdk.Tags.of(ecrStack).add('Component', 'ecr');
appStack.addDependency(ecrStack);
