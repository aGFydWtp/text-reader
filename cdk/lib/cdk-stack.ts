import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';

export interface TextReaderStackProps extends cdk.StackProps {
  frontendRepository: ecr.IRepository;
  frontendImageTag: string;
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
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    jobsTable.addGlobalSecondaryIndex({
      indexName: 'GSI_PollyTaskId',
      partitionKey: { name: 'pollyTaskId', type: dynamodb.AttributeType.STRING },
    });

    const ttsCompleteTopic = new sns.Topic(this, 'TtsCompleteTopic');

    const ttsStartFunction = new nodejs.NodejsFunction(this, 'TtsStartFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '..', 'lambdas', 'tts-start.ts'),
      handler: 'handler',
      environment: {
        FILES_BUCKET_NAME: filesBucket.bucketName,
        JOBS_TABLE_NAME: jobsTable.tableName,
        SNS_TOPIC_ARN: ttsCompleteTopic.topicArn,
        UPLOAD_PREFIX: 'files/uploaded/',
        OUTPUT_PREFIX: 'files/audio/',
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
    });

    new cdk.CfnOutput(this, 'FilesBucketName', { value: filesBucket.bucketName });
    new cdk.CfnOutput(this, 'JobsTableName', { value: jobsTable.tableName });
    new cdk.CfnOutput(this, 'TtsCompleteTopicArn', { value: ttsCompleteTopic.topicArn });
    new cdk.CfnOutput(this, 'FrontendFunctionUrl', { value: frontendFunctionUrl.url });
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });
  }
}
