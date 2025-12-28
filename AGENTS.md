# Repository Guidelines

## リポジトリ概要
- ルート: SvelteKit（SSR）フロントエンドとLambdaコンテナ用 `Dockerfile`
- `cdk/`: AWSリソース（CDK, TypeScript）と裏側Lambda（TypeScript）
- S3は単一バケットで `/files/*` を運用（CloudFrontのパスルーティング）

## 主なディレクトリ構成
- `cdk/`: インフラ定義、バックエンドLambda
- ルート配下: フロントエンド（SvelteKit）と関連設定

## 開発・ビルド・テスト
- パッケージマネージャは `pnpm` を使用する
- 具体的なコマンドは `package.json` が整い次第ここに追記する
- 例: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test`

## コーディング規約
- TypeScriptを前提に、インデントはスペース2を推奨
- ファイル名は `kebab-case`、型やクラスは `PascalCase` を基本とする
- フォーマッターは Biome を使用する

## テスト方針
- テスト基盤が整い次第、フレームワーク名と実行方法を明記する
- テストファイル命名規則（例: `*.test.ts`）を統一する

## AWS実装メモ
- `jobs` テーブル: GSI `GSI_PollyTaskId`（PK: `pollyTaskId`）
- SNS完了LambdaはGSIで検索し、0件は無視してACK
- TTS開始LambdaはPolly開始成功後にDynamoを1回のUpdateItemで更新

## コミット/PR
- 原則 PR 経由で `main` に入れる（自分だけでもレビュー代わりに差分確認する）
- 1PR = 1目的（小さく）。フロント/インフラ/データモデルの変更はできるだけ混ぜない
- マージは原則 **Squash merge**（`main` の履歴を読みやすく保つ）

### コミットメッセージ（推奨）
- Conventional Commits 風で統一する（厳密でなくてOK）
  - 例: `feat: add presigned upload API` / `infra: add jobs table GSI` / `fix: handle SNS duplicate events`

### PR の最低要件
- `main` の最新に追従（rebase/merge はどちらでもOK。最終的にCIが通ればよい）
- 変更に応じて以下を実行して通す
  - アプリ: `pnpm lint && pnpm test && pnpm build`
  - CDK: `pnpm -C cdk lint && pnpm -C cdk test && pnpm -C cdk synth`（コマンド確定後に更新）
- 破壊的変更（リソース名変更/削除、権限追加、公開範囲変更）がある場合は PR に明記

### PR テンプレ（コピペ用）
- 目的:
- 変更点:
- 影響範囲:
- 動作確認:
- デプロイ手順/注意点（必要なら）:
- TODO（後回しにしたもの）:

### Codex 作業の扱い
- Codex には「このブランチだけ触る」「PRを小さく」「コマンドを実行して結果を貼る」を依頼する
- 自動生成・大規模整形が入った場合は PR を分割して差分を読みやすくする

## ブランチ運用（個人開発）
- 方針: Trunk Based（短命ブランチ→mainへ即マージ）
- ルール:
  - `main` は常にデプロイ可能
  - Codexの作業は「1タスク = 1ブランチ = 1マージ」で小さく
  - マージは基本 Squash merge
- 流れ:
  - `main` を最新化
  - `feat/<task>` ブランチを作成
  - Codexにそのブランチ上で作業させる
  - `pnpm lint && pnpm test && pnpm build` を実行
  - `main` に squash merge → 即デプロイ
- ブランチ命名例:
  - `chore/bootstrap`
  - `infra/cdk-base`
  - `feat/upload-presigned`
  - `feat/tts-start-lambda`
  - `feat/tts-complete-lambda`
  - `feat/playback-signed-url`
