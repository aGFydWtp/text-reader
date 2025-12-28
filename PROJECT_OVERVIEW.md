# プロジェクト概要

## 目的
アップロードされたテキストを辞書置換付きで音声化し、生成音声を配信する。

## リポジトリ構成方針
- `cdk/`: AWSリソース（CDK, TypeScript）と裏側のLambda実装（TypeScript）
- ルート: フロントエンド（SvelteKit SSR）コード
- ルート: フロントエンドLambdaコンテナ用 `Dockerfile`

## 音声S3キー設計
- 出力キー: `files/audio/:id/output-:epochMillis.mp3`
- 再生成は常に新しい `epochMillis` で別オブジェクトを作成（旧MP3は保持）

## データストア設計
### DynamoDB（jobsテーブル）
- PK: `id`（UUID）
- 必須カラム:
  - `id`
  - `filename`
  - `uploadKey` = `files/uploaded/:id/:filename`
  - `status` = `PRESIGNED_ISSUED | TTS_STARTED | COMPLETED | FAILED`
  - `fileDict`（Map）
  - `pollyTaskId`（直近タスク）
  - `outputEpochMillis`（このタスクで出力する予定のepoch）
  - `latestAudioKey`（`files/audio/:id/output-<epochMillis>.mp3`）
  - `latestAudioCreatedAt`（epochMillis など）
  - `errorMessage`
  - `createdAt`, `updatedAt`
- GSI:
  - `GSI_PollyTaskId`（PK: `pollyTaskId`、SKなし。SNS完了通知からジョブを引くため）

## イベント駆動フロー
1. SSR API（SvelteKit on Lambda Web Adapter）
   - UUID発行
   - `jobs` 作成（初期 `status`）
   - `files/uploaded/:id/:filename` への presigned PUT 発行
2. ブラウザ → S3（`files/uploaded/…`）
   - 直アップロード
3. S3 `files/uploaded/…` → TTS開始Lambda
   - `status` を `TTS_STARTED` に更新
   - テキスト取得
   - `fileDict` を反映して SSML生成（完全一致置換 → `<sub alias="...">原文</sub>`）
   - `epochMillis = now()` 採番
   - `outputKey = files/audio/:id/output-:epochMillis.mp3` を構築
   - Polly `StartSpeechSynthesisTask` で `taskId` を取得
   - DynamoDB更新（同一更新でOK）:
     - `status = TTS_STARTED`
     - `pollyTaskId = taskId`
     - `outputEpochMillis = epochMillis`
     - `updatedAt = now()`
   - 出力先: `files/audio/:id/output-:epochMillis.mp3`
   - `SnsTopicArn` を指定して完了通知
4. SNS → 完了通知Lambda
   - SNSメッセージから `taskId` を取得
   - GSI（`pollyTaskId`）で `jobs` を検索
     - 0件: ログのみ出して正常終了（例: `taskId not found, ignore`）
   - 1件: 条件付き更新（`pollyTaskId` が一致している場合のみ）
      - 成功時:
        - `status = COMPLETED`
       - `latestAudioKey = files/audio/:id/output-:outputEpochMillis.mp3`
        - `latestAudioCreatedAt = :outputEpochMillis`
     - 失敗時:
       - `status = FAILED`
       - `errorMessage` 設定

## 配信・認可
- フロント: CloudFront → Function URL（SSR Lambda）
- 静的/音声: 同一CloudFrontで `/files/*` をS3へルーティング
- S3は単一バケット運用（`files/` プレフィックスで分離）
- DynamoDBにはURLを保存せず、`latestAudioKey` のみ保存
- 再生時は SSR API が `latestAudioKey` から署名付きURLを都度発行し `<audio>` に渡す
