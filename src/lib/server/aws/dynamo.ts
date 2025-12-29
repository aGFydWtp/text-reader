import { env } from '$env/dynamic/private';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export type JobItem = {
  pk: string;
  sk: string;
  id?: string;
  filename?: string;
  status?: string;
  updatedAt?: string | number;
  latestAudioCreatedAt?: string;
  latestAudioKey?: string;
  uploadKey?: string;
  fileDict?: Record<string, string>;
  errorMessage?: string;
};

const client = new DynamoDBClient({ region: env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export async function listJobsForUser(userSub: string): Promise<{
  items: JobItem[];
  error?: string;
}> {
  try {
    if (!env.JOBS_TABLE_NAME) {
      return { items: [], error: 'JOBS_TABLE_NAME is not set' };
    }

    const pk = `USER#${userSub}`;
    const response = await docClient.send(
      new QueryCommand({
        TableName: env.JOBS_TABLE_NAME,
        KeyConditionExpression: 'pk = :pk and begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':skPrefix': 'JOB#',
        },
      }),
    );

    const items = (response.Items ?? []) as JobItem[];
    const sorted = items.sort((a, b) => {
      const aTime = a.updatedAt ?? '';
      const bTime = b.updatedAt ?? '';
      return String(bTime).localeCompare(String(aTime));
    });

    return { items: sorted };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Failed to load jobs',
    };
  }
}

export async function createJob(payload: {
  userSub: string;
  jobId: string;
  filename: string;
  uploadKey: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}): Promise<{ error?: string }> {
  try {
    if (!env.JOBS_TABLE_NAME) {
      return { error: 'JOBS_TABLE_NAME is not set' };
    }

    await docClient.send(
      new PutCommand({
        TableName: env.JOBS_TABLE_NAME,
        Item: {
          pk: `USER#${payload.userSub}`,
          sk: `JOB#${payload.jobId}`,
          id: payload.jobId,
          filename: payload.filename,
          uploadKey: payload.uploadKey,
          status: payload.status,
          createdAt: payload.createdAt,
          updatedAt: payload.updatedAt,
        },
      }),
    );

    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create job',
    };
  }
}

export async function getJobForUser(payload: {
  userSub: string;
  jobId: string;
}): Promise<{ job?: JobItem; error?: string }> {
  try {
    if (!env.JOBS_TABLE_NAME) {
      return { error: 'JOBS_TABLE_NAME is not set' };
    }

    const response = await docClient.send(
      new QueryCommand({
        TableName: env.JOBS_TABLE_NAME,
        KeyConditionExpression: 'pk = :pk and sk = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${payload.userSub}`,
          ':sk': `JOB#${payload.jobId}`,
        },
        Limit: 1,
      }),
    );

    const job = (response.Items ?? [])[0] as JobItem | undefined;
    return { job };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load job' };
  }
}

export async function updateJobDictionary(payload: {
  userSub: string;
  jobId: string;
  fileDict: Record<string, string>;
}): Promise<{ error?: string }> {
  try {
    if (!env.JOBS_TABLE_NAME) {
      return { error: 'JOBS_TABLE_NAME is not set' };
    }

    await docClient.send(
      new UpdateCommand({
        TableName: env.JOBS_TABLE_NAME,
        Key: {
          pk: `USER#${payload.userSub}`,
          sk: `JOB#${payload.jobId}`,
        },
        UpdateExpression: 'SET fileDict = :fileDict, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':fileDict': payload.fileDict,
          ':updatedAt': new Date().toISOString(),
        },
        ConditionExpression: 'attribute_exists(pk)',
      }),
    );

    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update dictionary' };
  }
}
