import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetSpeechSynthesisTaskCommand, PollyClient } from "@aws-sdk/client-polly";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SNSEvent } from "aws-lambda";

const polly = new PollyClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const { JOBS_TABLE_NAME, OUTPUT_PREFIX = "files/audio/" } = process.env;

/**
 * 必須環境変数をチェックし、不足時は例外を投げる。
 */
const ensureRequiredEnv = () => {
  if (!JOBS_TABLE_NAME) {
    throw new Error("Missing required env var: JOBS_TABLE_NAME");
  }
};

/**
 * 末尾のスラッシュ有無を正規化する。
 * @param prefix S3 プレフィックス
 * @returns スラッシュ付きプレフィックス
 */
const normalizePrefix = (prefix: string): string => (prefix.endsWith("/") ? prefix : `${prefix}/`);

/**
 * Polly OutputUri から S3 のオブジェクトキーを抽出する。
 * s3:// 形式と https 形式の両方に対応する。
 * @param outputUri Polly が返す OutputUri
 * @returns 取得できたキー文字列、失敗時は null
 */
const extractKeyFromOutputUri = (outputUri?: string): string | null => {
  if (!outputUri) return null;
  try {
    if (outputUri.startsWith("s3://")) {
      const withoutScheme = outputUri.slice("s3://".length);
      const [, ...keyParts] = withoutScheme.split("/");
      return keyParts.join("/");
    }

    const url = new URL(outputUri);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return parts.slice(1).join("/");
  } catch {
    return null;
  }
};

/**
 * SNS メッセージ文字列から taskId を抽出する。
 * @param message SNS メッセージ本文
 * @returns taskId があれば文字列、なければ null
 */
const extractTaskId = (message: string): string | null => {
  try {
    const parsed = JSON.parse(message);
    return parsed.taskId ?? parsed.TaskId ?? parsed.taskID ?? null;
  } catch {
    return null;
  }
};

/**
 * Polly 完了 SNS を受け取り、ジョブ状態を COMPLETED/FAILED に更新する Lambda ハンドラー。
 * @param event SNS イベント
 */
export const handler = async (event: SNSEvent): Promise<void> => {
  ensureRequiredEnv();
  console.log("TTS complete event received", JSON.stringify(event, null, 2));

  for (const record of event.Records ?? []) {
    const message = record.Sns?.Message ?? "";
    const taskId = extractTaskId(message);

    if (!taskId) {
      console.warn("SNS message missing taskId, skip", { message });
      continue;
    }

    const queryResult = await dynamo.send(
      new QueryCommand({
        TableName: JOBS_TABLE_NAME,
        IndexName: "GSI_PollyTaskId",
        KeyConditionExpression: "pollyTaskId = :taskId",
        ExpressionAttributeValues: {
          ":taskId": taskId,
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
      outputKeyPrefix?: string;
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

    if (status !== "completed" && status !== "failed") {
      console.info(`Polly task status ${status} for taskId=${taskId}, skip`);
      continue;
    }

    const now = Date.now();

    if (status === "completed") {
      const outputKeyFromPolly = extractKeyFromOutputUri(
        pollyTask.SynthesisTask?.OutputUri ?? undefined,
      );
      const audioKey =
        outputKeyFromPolly ??
        (job.outputKeyPrefix && taskId ? `${job.outputKeyPrefix}.${taskId}.mp3` : null) ??
        `${normalizePrefix(OUTPUT_PREFIX)}${job.id}/output-${job.outputEpochMillis}.mp3`;

      await dynamo.send(
        new UpdateCommand({
          TableName: JOBS_TABLE_NAME,
          Key: { pk: job.pk, sk: job.sk },
          UpdateExpression:
            "SET #status = :status, latestAudioKey = :latestAudioKey, latestAudioCreatedAt = :latestAudioCreatedAt, updatedAt = :updatedAt",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": "COMPLETED",
            ":latestAudioKey": audioKey,
            ":latestAudioCreatedAt": job.outputEpochMillis,
            ":updatedAt": now,
            ":taskId": taskId,
          },
          ConditionExpression: "pollyTaskId = :taskId",
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
          "SET #status = :status, errorMessage = :errorMessage, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "FAILED",
          ":errorMessage": errorMessage,
          ":updatedAt": now,
          ":taskId": taskId,
        },
        ConditionExpression: "pollyTaskId = :taskId",
      }),
    );
  }
};
