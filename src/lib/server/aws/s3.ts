import { env } from "$env/dynamic/private";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({ region: env.AWS_REGION });

export async function createUploadUrl(payload: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ url?: string; error?: string }> {
  if (!env.FILES_BUCKET_NAME) {
    return { error: "FILES_BUCKET_NAME is not set" };
  }

  const command = new PutObjectCommand({
    Bucket: env.FILES_BUCKET_NAME,
    Key: payload.key,
    ContentType: payload.contentType,
  });

  try {
    const url = await getSignedUrl(client, command, {
      expiresIn: payload.expiresInSeconds ?? 15 * 60,
    });
    return { url };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create upload URL",
    };
  }
}

export async function createDownloadUrl(payload: {
  key: string;
  expiresInSeconds?: number;
}): Promise<{ url?: string; error?: string }> {
  if (!env.FILES_BUCKET_NAME) {
    return { error: "FILES_BUCKET_NAME is not set" };
  }

  const command = new GetObjectCommand({
    Bucket: env.FILES_BUCKET_NAME,
    Key: payload.key,
  });

  try {
    const url = await getSignedUrl(client, command, {
      expiresIn: payload.expiresInSeconds ?? 15 * 60,
    });
    return { url };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create download URL",
    };
  }
}
