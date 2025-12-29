import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';

export interface TextReaderStackProps extends cdk.StackProps {
  frontendRepository: ecr.IRepository;
  frontendImageTag: string;
  customDomain?: {
    hostedZoneId: string;
    hostedZoneName: string;
    domainName: string;
    certificateArn: string;
    recordName: string;
  };
  cognitoCustomDomain?: {
    domainName: string;
    certificateArn: string;
  };
}

export class TextReaderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TextReaderStackProps) {
    super(scope, id, props);

    const filesBucket = new s3.Bucket(this, 'FilesBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    const jobsTable = new dynamodb.Table(this, 'JobsTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    jobsTable.addGlobalSecondaryIndex({
      indexName: 'GSI_PollyTaskId',
      partitionKey: { name: 'pollyTaskId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
    });

    jobsTable.addGlobalSecondaryIndex({
      indexName: 'GSI_JobId',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    });

    const ttsCompleteTopic = new sns.Topic(this, 'TtsCompleteTopic');

    const ttsStartFunction = new nodejs.NodejsFunction(this, 'TtsStartFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(120),
      entry: path.join(__dirname, '..', 'lambdas', 'tts-start.ts'),
      handler: 'handler',
      environment: {
        FILES_BUCKET_NAME: filesBucket.bucketName,
        JOBS_TABLE_NAME: jobsTable.tableName,
        SNS_TOPIC_ARN: ttsCompleteTopic.topicArn,
        UPLOAD_PREFIX: 'files/uploaded/',
        OUTPUT_PREFIX: 'files/audio/',
        POLLY_VOICE_ID: 'Takumi',
        POLLY_ENGINE: 'neural',
      },
    });

    ttsStartFunction.addEventSource(
      new lambdaEventSources.S3EventSource(filesBucket, {
        events: [s3.EventType.OBJECT_CREATED_PUT],
        filters: [{ prefix: 'files/uploaded/' }],
      }),
    );

    jobsTable.grantReadWriteData(ttsStartFunction);
    filesBucket.grantRead(ttsStartFunction, 'files/uploaded/*');
    filesBucket.grantPut(ttsStartFunction, 'files/audio/*');
    ttsCompleteTopic.grantPublish(ttsStartFunction);
    ttsStartFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['polly:StartSpeechSynthesisTask'],
        resources: ['*'],
      }),
    );

    const ttsCompleteFunction = new nodejs.NodejsFunction(this, 'TtsCompleteFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(30),
      entry: path.join(__dirname, '..', 'lambdas', 'tts-complete.ts'),
      handler: 'handler',
      environment: {
        FILES_BUCKET_NAME: filesBucket.bucketName,
        JOBS_TABLE_NAME: jobsTable.tableName,
      },
    });

    ttsCompleteTopic.addSubscription(new snsSubscriptions.LambdaSubscription(ttsCompleteFunction));
    jobsTable.grantReadWriteData(ttsCompleteFunction);
    ttsCompleteFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['polly:GetSpeechSynthesisTask'],
        resources: ['*'],
      }),
    );

    const frontendFunction = new lambda.DockerImageFunction(this, 'FrontendFunction', {
      code: lambda.DockerImageCode.fromEcr(props.frontendRepository, {
        tagOrDigest: props.frontendImageTag,
      }),
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(60),
      environment: {
        FILES_BUCKET_NAME: filesBucket.bucketName,
        JOBS_TABLE_NAME: jobsTable.tableName,
      },
    });

    const frontendFunctionUrl = frontendFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    const filesOrigin = origins.S3BucketOrigin.withOriginAccessControl(filesBucket);
    const frontendOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(frontendFunctionUrl);

    const certificate = props.customDomain
      ? certificatemanager.Certificate.fromCertificateArn(
          this,
          'CustomDomainCertificate',
          props.customDomain.certificateArn,
        )
      : undefined;

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: frontendOrigin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        'files/*': {
          origin: filesOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      ...(props.customDomain
        ? {
            domainNames: [props.customDomain.domainName],
            certificate,
          }
        : {}),
    });

    if (props.customDomain) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'CustomDomainHostedZone', {
        hostedZoneId: props.customDomain.hostedZoneId,
        zoneName: props.customDomain.hostedZoneName,
      });

      new route53.ARecord(this, 'CloudFrontAliasRecord', {
        zone: hostedZone,
        recordName: props.customDomain.recordName,
        target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
      });

      new route53.AaaaRecord(this, 'CloudFrontAliasRecordIpv6', {
        zone: hostedZone,
        recordName: props.customDomain.recordName,
        target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
      });
    }

    const userPool = new cognito.UserPool(this, 'UserPool', {
      featurePlan: cognito.FeaturePlan.ESSENTIALS,
      mfa: cognito.Mfa.OFF,
      signInPolicy: {
        allowedFirstAuthFactors: {
          password: true,
          passkey: true,
        },
      },
      passkeyUserVerification: cognito.PasskeyUserVerification.PREFERRED,
    });

    const cognitoDomainPrefix = props.cognitoCustomDomain
      ? undefined
      : new cdk.CfnParameter(this, 'CognitoDomainPrefix', {
          type: 'String',
          description: 'Unique domain prefix for Cognito hosted UI (Managed Login).',
        });

    const userPoolDomain = props.cognitoCustomDomain
      ? userPool.addDomain('UserPoolDomain', {
          customDomain: {
            domainName: props.cognitoCustomDomain.domainName,
            certificate: certificatemanager.Certificate.fromCertificateArn(
              this,
              'CognitoCustomDomainCertificate',
              props.cognitoCustomDomain.certificateArn,
            ),
          },
        })
      : userPool.addDomain('UserPoolDomain', {
          cognitoDomain: {
            domainPrefix: cognitoDomainPrefix!.valueAsString,
          },
        });

    const localBaseUrl = 'http://localhost:5173';
    const callbackUrls = [
      `https://${distribution.distributionDomainName}/auth/callback`,
      `${localBaseUrl}/auth/callback`,
    ];
    const logoutUrls = [
      `https://${distribution.distributionDomainName}/logout`,
      `${localBaseUrl}/logout`,
    ];

    const userPoolClient = userPool.addClient('UserPoolClient', {
      authFlows: {
        user: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.EMAIL,
        ],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    const userPoolCfn = userPool.node.defaultChild as cognito.CfnUserPool;
    userPoolCfn.webAuthnRelyingPartyId = userPoolDomain.domainName;

    if (props.cognitoCustomDomain && props.customDomain) {
      const cognitoHostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this,
        'CognitoHostedZone',
        {
          hostedZoneId: props.customDomain.hostedZoneId,
          zoneName: props.customDomain.hostedZoneName,
        },
      );

      const recordSuffix = `.${props.customDomain.hostedZoneName}`;
      const recordName = props.cognitoCustomDomain.domainName.endsWith(recordSuffix)
        ? props.cognitoCustomDomain.domainName.slice(0, -recordSuffix.length)
        : props.cognitoCustomDomain.domainName;

      new route53.CnameRecord(this, 'CognitoDomainRecord', {
        zone: cognitoHostedZone,
        recordName,
        domainName: userPoolDomain.cloudFrontEndpoint,
      });
    }

    // 将来的に FunctionUrlOrigin.withOriginAccessControl(functionUrl); で自動で付与される可能性もある。（lambda:InvokeFunctionUrl は自動で付与されているため）
    frontendFunction.addPermission("AllowCloudFrontInvokeFunction", {
      principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
      invokedViaFunctionUrl: true,
      action: "lambda:InvokeFunction",
      sourceArn: distribution.distributionArn,
    });

    new cdk.CfnOutput(this, 'FilesBucketName', { value: filesBucket.bucketName });
    new cdk.CfnOutput(this, 'JobsTableName', { value: jobsTable.tableName });
    new cdk.CfnOutput(this, 'TtsCompleteTopicArn', { value: ttsCompleteTopic.topicArn });
    new cdk.CfnOutput(this, 'FrontendFunctionUrl', { value: frontendFunctionUrl.url });
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'CognitoHostedUiDomain', { value: userPoolDomain.domainName });
  }
}
