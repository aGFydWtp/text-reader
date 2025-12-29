import { env } from '$env/dynamic/private';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

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
      return bTime.localeCompare(aTime);
    });

    return { items: sorted };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Failed to load jobs',
    };
  }
}
