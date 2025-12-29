import { env } from '$env/dynamic/private';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export type JobItem = {
  pk: string;
  sk: string;
  filename?: string;
  status?: string;
  updatedAt?: string;
  latestAudioCreatedAt?: string;
  latestAudioKey?: string;
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
