import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PollyClient, StartSpeechSynthesisTaskCommand, VoiceId } from '@aws-sdk/client-polly';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { S3Event } from 'aws-lambda';
import type { Readable } from 'node:stream';

const s3 = new S3Client({});
const polly = new PollyClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const {
  FILES_BUCKET_NAME,
  JOBS_TABLE_NAME,
  SNS_TOPIC_ARN,
  UPLOAD_PREFIX = 'files/uploaded/',
  OUTPUT_PREFIX = 'files/audio/',
  POLLY_VOICE_ID = 'Takumi',
  POLLY_ENGINE = 'standard',
} = process.env;

const ensureRequiredEnv = () => {
  const missing = [
    ['FILES_BUCKET_NAME', FILES_BUCKET_NAME],
    ['JOBS_TABLE_NAME', JOBS_TABLE_NAME],
    ['SNS_TOPIC_ARN', SNS_TOPIC_ARN],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
};

const streamToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
};

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const applyDictionary = (text: string, dict: Record<string, string>): string => {
  const escapedText = escapeXml(text);
  const entries = Object.entries(dict)
    .filter(([source]) => source.length > 0)
    .sort((a, b) => b[0].length - a[0].length);

  return entries.reduce((acc, [source, alias]) => {
    const escapedSource = escapeXml(source);
    const escapedAlias = escapeXml(alias);
    const replacement = `<sub alias="${escapedAlias}">${escapedSource}</sub>`;
    return acc.replaceAll(escapedSource, replacement);
  }, escapedText);
};

const normalizePrefix = (prefix: string): string => (prefix.endsWith('/') ? prefix : `${prefix}/`);

export const handler = async (event: S3Event): Promise<void> => {
  ensureRequiredEnv();
  console.log('TTS start event received', JSON.stringify(event, null, 2));

  for (const record of event.Records ?? []) {
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    if (!objectKey.startsWith(UPLOAD_PREFIX)) {
      console.warn(`Skipping object outside upload prefix: ${objectKey}`);
      continue;
    }

    const relativePath = objectKey.slice(UPLOAD_PREFIX.length);
    const [jobId, ...fileParts] = relativePath.split('/');
    const filename = fileParts.join('/');

    if (!jobId || !filename) {
      console.warn(`Skipping object with unexpected key format: ${objectKey}`);
      continue;
    }

    const getObject = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );

    if (!getObject.Body) {
      throw new Error(`Empty S3 object body: ${objectKey}`);
    }

    const text = await streamToString(getObject.Body as Readable);

    const jobResult = await dynamo.send(
      new QueryCommand({
        TableName: JOBS_TABLE_NAME,
        IndexName: 'GSI_JobId',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': jobId,
        },
        Limit: 2,
      }),
    );

    if (!jobResult.Items || jobResult.Items.length === 0) {
      console.warn(`Job not found for id=${jobId}. Skipping.`);
      continue;
    }

    if (jobResult.Items.length > 1) {
      console.warn(`Multiple jobs found for id=${jobId}, using first.`);
    }

    const job = jobResult.Items[0] as {
      pk: string;
      sk: string;
      id: string;
      fileDict?: Record<string, string>;
    };

    const fileDict = (job.fileDict ?? {}) as Record<string, string>;
    const ssmlBody = applyDictionary(text, fileDict);
    const ssml = `<speak>${ssmlBody}</speak>`;

    const epochMillis = Date.now();
    const outputKey = `${normalizePrefix(OUTPUT_PREFIX)}${jobId}/output-${epochMillis}.mp3`;

    const voiceId = POLLY_VOICE_ID as VoiceId;
    const startTask = await polly.send(
      new StartSpeechSynthesisTaskCommand({
        OutputFormat: 'mp3',
        OutputS3BucketName: FILES_BUCKET_NAME,
        OutputS3KeyPrefix: outputKey,
        Text: ssml,
        TextType: 'ssml',
        VoiceId: voiceId,
        Engine: POLLY_ENGINE === 'neural' ? 'neural' : 'standard',
        SnsTopicArn: SNS_TOPIC_ARN,
      }),
    );

    const taskId = startTask.SynthesisTask?.TaskId;
    if (!taskId) {
      throw new Error(`Polly did not return TaskId for jobId=${jobId}`);
    }

    await dynamo.send(
      new UpdateCommand({
        TableName: JOBS_TABLE_NAME,
        Key: { pk: job.pk, sk: job.sk },
        UpdateExpression:
          'SET #status = :status, pollyTaskId = :pollyTaskId, outputEpochMillis = :outputEpochMillis, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'TTS_STARTED',
          ':pollyTaskId': taskId,
          ':outputEpochMillis': epochMillis,
          ':updatedAt': epochMillis,
        },
        ConditionExpression: 'attribute_exists(pk)',
      }),
    );
  }
};
