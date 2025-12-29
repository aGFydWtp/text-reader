import { PollyClient, GetSpeechSynthesisTaskCommand } from '@aws-sdk/client-polly';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { SNSEvent } from 'aws-lambda';

const polly = new PollyClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const { JOBS_TABLE_NAME, OUTPUT_PREFIX = 'files/audio/' } = process.env;

const ensureRequiredEnv = () => {
  if (!JOBS_TABLE_NAME) {
    throw new Error('Missing required env var: JOBS_TABLE_NAME');
  }
};

const normalizePrefix = (prefix: string): string => (prefix.endsWith('/') ? prefix : `${prefix}/`);

const extractTaskId = (message: string): string | null => {
  try {
    const parsed = JSON.parse(message);
    return parsed.taskId ?? parsed.TaskId ?? parsed.taskID ?? null;
  } catch {
    return null;
  }
};

export const handler = async (event: SNSEvent): Promise<void> => {
  ensureRequiredEnv();
  console.log('TTS complete event received', JSON.stringify(event, null, 2));

  for (const record of event.Records ?? []) {
    const message = record.Sns?.Message ?? '';
    const taskId = extractTaskId(message);

    if (!taskId) {
      console.warn('SNS message missing taskId, skip', { message });
      continue;
    }

    const queryResult = await dynamo.send(
      new QueryCommand({
        TableName: JOBS_TABLE_NAME,
        IndexName: 'GSI_PollyTaskId',
        KeyConditionExpression: 'pollyTaskId = :taskId',
        ExpressionAttributeValues: {
          ':taskId': taskId,
        },
      }),
    );

    if (!queryResult.Items || queryResult.Items.length === 0) {
      console.info(`taskId not found, ignore: ${taskId}`);
      continue;
    }

    if (queryResult.Items.length > 1) {
      console.warn(`Multiple jobs found for taskId=${taskId}, using first.`);
    }

    const job = queryResult.Items[0] as {
      pk: string;
      sk: string;
      id: string;
      outputEpochMillis?: number;
    };

    if (!job.outputEpochMillis) {
      console.warn(`Missing outputEpochMillis for job ${job.id}, skip`);
      continue;
    }

    const pollyTask = await polly.send(
      new GetSpeechSynthesisTaskCommand({
        TaskId: taskId,
      }),
    );

    const status = pollyTask.SynthesisTask?.TaskStatus;
    if (!status) {
      console.warn(`Polly task status missing for taskId=${taskId}, skip`);
      continue;
    }

    if (status !== 'completed' && status !== 'failed') {
      console.info(`Polly task status ${status} for taskId=${taskId}, skip`);
      continue;
    }

    const audioKey = `${normalizePrefix(OUTPUT_PREFIX)}${job.id}/output-${job.outputEpochMillis}.mp3`;
    const now = Date.now();

    if (status === 'completed') {
      await dynamo.send(
        new UpdateCommand({
          TableName: JOBS_TABLE_NAME,
          Key: { pk: job.pk, sk: job.sk },
          UpdateExpression:
            'SET #status = :status, latestAudioKey = :latestAudioKey, latestAudioCreatedAt = :latestAudioCreatedAt, updatedAt = :updatedAt',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'COMPLETED',
            ':latestAudioKey': audioKey,
            ':latestAudioCreatedAt': job.outputEpochMillis,
            ':updatedAt': now,
            ':taskId': taskId,
          },
          ConditionExpression: 'pollyTaskId = :taskId',
        }),
      );
      continue;
    }

    const errorMessage =
      pollyTask.SynthesisTask?.TaskStatusReason ?? `Polly task failed: ${taskId}`;

    await dynamo.send(
      new UpdateCommand({
        TableName: JOBS_TABLE_NAME,
        Key: { pk: job.pk, sk: job.sk },
        UpdateExpression:
          'SET #status = :status, errorMessage = :errorMessage, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'FAILED',
          ':errorMessage': errorMessage,
          ':updatedAt': now,
          ':taskId': taskId,
        },
        ConditionExpression: 'pollyTaskId = :taskId',
      }),
    );
  }
};
