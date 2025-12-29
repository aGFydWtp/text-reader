# Goal
SvelteKit（SSR）で最小実装を作る：
- Cognito Hosted UI（Authorization Code + PKCE）でログイン
- ログイン後、トップページ（/）に DynamoDB jobs テーブルから「自分のファイル一覧（ジョブ一覧）」を表示する
- まずは一覧表示のみ（アップロード/生成/再生などは後回し）

# Tech / Constraints
- SvelteKit (TypeScript, SSR)
- トークンはブラウザ(localStorage等)に保存しない
- code->token交換はSSR側で行い、HttpOnly Cookie に保存
- 認証状態は `hooks.server.ts` で判定し、保護ルートは `+layout.server.ts` でガード
- AWS SDK v3 で DynamoDB を読む（Lambda実行時はIAM Role、ローカルは ~/.aws 認証でOK）

# Environment Variables (.env)
## Cognito (Hosted UI)
- PUBLIC_APP_ORIGIN=http://localhost:5173   # 本番は https://text-reader.app.hr20k.com
- COGNITO_DOMAIN=https://auth.text-reader.app.hr20k.com
- COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxx
- COGNITO_ISSUER=https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_xxxxxxxx

## AWS
- AWS_REGION=ap-northeast-1
- JOBS_TABLE_NAME=TextReaderJobsTableName

# Auth Flow
## /login
- PKCE code_verifier を生成（十分長いランダム）
- code_challenge = base64url(SHA256(code_verifier))
- state もランダム生成
- `pkce_verifier` と `oidc_state` を HttpOnly Cookie に保存（短TTL、SameSite=Lax、Secureは本番のみ）
- Hosted UI の authorize へ 302 リダイレクト
  - response_type=code
  - client_id
  - redirect_uri = `${PUBLIC_APP_ORIGIN}/auth/callback`
  - scope = "openid email profile"
  - code_challenge, code_challenge_method=S256
  - state

## /auth/callback
- queryの code と state を受け取る
- Cookie の oidc_state と照合（不一致なら401）
- Cookie の pkce_verifier を使って token endpoint へ POST してトークン取得
  - POST `${COGNITO_DOMAIN}/oauth2/token`
  - grant_type=authorization_code
  - client_id
  - code
  - redirect_uri
  - code_verifier
- 取得した `id_token` と `access_token` を HttpOnly Cookie に保存
  - cookie 名例: `id_token`, `access_token`
  - Secure(本番のみ) / SameSite=Lax / Path=/
- PKCE用cookieは削除
- 成功したら `/` へリダイレクト

## /logout
- `id_token` / `access_token` を削除
- Cognito logout endpoint にリダイレクト
  - `${COGNITO_DOMAIN}/logout?client_id=...&logout_uri=${PUBLIC_APP_ORIGIN}/logout` ではなく、
  - 実装としては「アプリ側でcookie削除」→「Cognito logoutへ飛ばす」→「戻り先は `${PUBLIC_APP_ORIGIN}/`」の形にする
  - logout_uri は `${PUBLIC_APP_ORIGIN}/` を使う（無限ループ回避）

# Session Handling
- `hooks.server.ts` で毎リクエスト cookie の `id_token` を読む
- まずは最小で「存在すればログイン扱い」でも良いが、
  できれば issuer の JWKS を取得して id_token の署名検証 + exp チェックを行う
- `event.locals.user` に最低限のユーザー情報を入れる
  - sub, email（取れれば）
- `locals.user` が無い場合、保護ルートでは /login へリダイレクト

# Routes / Pages
## / (protected)
- `+layout.server.ts` で `locals.user` を必須にして、未ログインなら /login へ
- `+page.server.ts` で DynamoDB jobs テーブルを query して一覧を返す

DynamoDB 仕様（PROJECT_OVERVIEW に従う）
- PK: `pk = USER#<cognitoSub>`
- SK: `sk = JOB#<jobUuid>`
- 表示したい項目（あれば）：filename, status, updatedAt, latestAudioCreatedAt, latestAudioKey

取得ロジック（最小）
- `QueryCommand` を使って pk でQuery
- SK条件は begins_with("JOB#")（pk単位で他が無いなら省略可）
- 並び順は createdAt / updatedAt の降順（Query結果をアプリ側でsortしてOK）
- 失敗時は空配列 + エラーメッセージを表示

UI（最低限）
- ヘッダ：ログアウトリンク
- メイン：ファイル一覧テーブル（filename / status / updatedAt）
- 空のとき「ファイルがありません」
- 未ログイン状態のUIは不要（/ は保護するため）

## /login (public)
- ルートハンドラ（+server.ts）で302リダイレクトするだけでOK

## /auth/callback (public)
- ルートハンドラ（+server.ts）でトークン交換＆cookie保存＆302

## /logout (public)
- ルートハンドラ（+server.ts）でcookie削除して `/` へ

# File/Code Structure (suggested)
- src/hooks.server.ts
- src/lib/server/auth/*
  - pkce.ts（verifier/challenge生成）
  - cookies.ts（cookie set/delete）
  - oidc.ts（authorize URL生成、token交換、(可能なら) JWT検証）
- src/lib/server/aws/dynamo.ts（DDB client）
- src/routes/login/+server.ts
- src/routes/auth/callback/+server.ts
- src/routes/logout/+server.ts
- src/routes/+layout.server.ts（保護）
- src/routes/+page.server.ts（jobs取得）
- src/routes/+page.svelte（一覧表示）

# Acceptance Criteria
- ローカルで `pnpm dev` し、/ にアクセスすると /login に飛ぶ
- /login で Cognito Hosted UI に遷移し、ログイン後 /auth/callback を経由して / に戻る
- / で DynamoDB から自分の pk の jobs が一覧表示される
- /logout でログアウトでき、再度 / で /login に飛ぶ
- トークンは localStorage 等に保存しない（HttpOnly cookieのみ）

# Notes
- CloudFront 配下で動く想定だが、最小実装ではキャッシュ制御は後回し
- ただし /login /auth/callback /logout はキャッシュされない前提で実装する（SSRで動的）