import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class TextReaderSecretsStack extends cdk.Stack {
  public readonly googleOAuthSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const googleSecretName = new cdk.CfnParameter(this, 'GoogleOAuthSecretName', {
      type: 'String',
      default: 'text-reader/google-oauth',
      description: 'Secrets Manager name for the Google OAuth client secret.',
    });

    const googleClientSecret = new cdk.CfnParameter(this, 'GoogleClientSecret', {
      type: 'String',
      noEcho: true,
      description: 'Google OAuth client secret.',
    });

    const googleSecret = new secretsmanager.Secret(this, 'GoogleOAuthSecret', {
      secretName: googleSecretName.valueAsString,
      secretStringValue: cdk.SecretValue.unsafePlainText(googleClientSecret.valueAsString),
    });

    this.googleOAuthSecret = googleSecret;

    new cdk.CfnOutput(this, 'GoogleOAuthSecretNameOutput', {
      value: googleSecret.secretName,
    });
  }
}
