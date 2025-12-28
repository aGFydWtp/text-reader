import type { S3Event } from 'aws-lambda';

export const handler = async (event: S3Event): Promise<void> => {
  console.log('TTS start event received', JSON.stringify(event, null, 2));

  // TODO: parse object key, load text, apply dictionary, generate SSML,
  // start Polly task, then update DynamoDB with taskId and outputEpochMillis.
};
