import { env } from '$env/dynamic/private';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

const client = new LambdaClient({ region: env.AWS_REGION });

export async function invokeTtsStart(jobId: string): Promise<{ error?: string }> {
  if (!env.TTS_START_FUNCTION_NAME) {
    return { error: 'TTS_START_FUNCTION_NAME is not set' };
  }

  try {
    await client.send(
      new InvokeCommand({
        FunctionName: env.TTS_START_FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({ jobId })),
      }),
    );
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to invoke TTS start' };
  }
}
