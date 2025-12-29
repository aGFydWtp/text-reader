<script lang="ts">
  import { enhance } from '$app/forms';

  let file: File | null = null;
  let fileInput: HTMLInputElement | null = null;
  let status: 'idle' | 'registering' | 'uploading' | 'done' | 'error' = 'idle';
  let message = '';

  function onFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
    message = '';
    if (!file) {
      status = 'idle';
    }
  }

  const handleEnhance = (form: HTMLFormElement) =>
    enhance(form, ({ formData, cancel }) => {
    if (!file) {
      cancel();
      status = 'error';
      message = 'ファイルを選択してください。';
      return;
    }

    formData.set('filename', file.name);
    formData.set('contentType', file.type || 'application/octet-stream');
    status = 'registering';

    return async ({ result }) => {
      if (result.type !== 'success') {
        status = 'error';
        message = result.type === 'failure' ? result.data?.error ?? '登録に失敗しました。' : '登録に失敗しました。';
        return;
      }

      const uploadUrl = result.data?.uploadUrl as string | undefined;
      if (!uploadUrl) {
        status = 'error';
        message = 'アップロードURLの取得に失敗しました。';
        return;
      }

      status = 'uploading';
      message = 'アップロード中...';

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'content-type': file?.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!response.ok) {
        status = 'error';
        message = `アップロードに失敗しました (${response.status})`;
        return;
      }

      status = 'done';
      message = 'アップロードが完了しました。処理の反映まで少しお待ちください。';
      file = null;
      if (fileInput) {
        fileInput.value = '';
      }
    };
  });
</script>

<section class="page">
  <div class="header">
    <div>
      <h1>ファイル登録</h1>
      <p>音声化したいテキストファイルを登録します。</p>
    </div>
    <a class="back" href="/">一覧へ戻る</a>
  </div>

  <form class="form" method="post" enctype="multipart/form-data" use:handleEnhance>
    <label class="field">
      <span>テキストファイル</span>
      <input
        bind:this={fileInput}
        type="file"
        name="file"
        accept=".txt,text/plain"
        on:change={onFileChange}
      />
    </label>

    <button type="submit" disabled={status === 'registering' || status === 'uploading'}>
      {#if status === 'registering'}
        登録中...
      {:else if status === 'uploading'}
        アップロード中...
      {:else}
        登録してアップロード
      {/if}
    </button>
  </form>

  {#if message}
    <div class={status === 'error' ? 'notice error' : 'notice'}>{message}</div>
  {/if}
</section>

<style>
  .page {
    display: grid;
    gap: 20px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  h1 {
    font-size: 24px;
    font-weight: 600;
  }

  p {
    color: #6b645c;
    font-size: 14px;
  }

  .back {
    font-size: 14px;
    text-decoration: none;
    color: #5b4b32;
  }

  .form {
    display: grid;
    gap: 16px;
    padding: 20px;
    border-radius: 16px;
    border: 1px solid #e5e0d9;
    background: #fffdf8;
    max-width: 520px;
  }

  .field {
    display: grid;
    gap: 8px;
    font-size: 14px;
  }

  input[type='file'] {
    padding: 8px;
    border-radius: 10px;
    border: 1px solid #ded6cc;
    background: #fff;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 12px 16px;
    background: #1d1d1d;
    color: #fff;
    font-weight: 600;
  }

  button:disabled {
    background: #8e877f;
    cursor: not-allowed;
  }

  .notice {
    padding: 12px 16px;
    border-radius: 12px;
    background: #f5f2ed;
    color: #3f372e;
    max-width: 520px;
  }

  .notice.error {
    background: #fff3f0;
    color: #9c2c12;
    border: 1px solid #f1c7ba;
  }

  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
