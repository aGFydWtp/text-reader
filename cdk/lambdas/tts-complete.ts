import type { SNSEvent } from 'aws-lambda';

export const handler = async (event: SNSEvent): Promise<void> => {
  console.log('TTS complete event received', JSON.stringify(event, null, 2));

  // TODO: extract taskId, lookup job via GSI, conditionally update status,
  // and populate latestAudioKey/latestAudioCreatedAt.
};
