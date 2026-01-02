<script lang="ts">
import { enhance } from "$app/forms";

type InputMode = "file" | "clipboard";

let file = $state<File | null>(null);
let fileInput = $state<HTMLInputElement | null>(null);
let inputMode = $state<InputMode>("file");
let clipboardText = $state("");
let clipboardFilename = $state("");
const charCount = $derived(clipboardText.length);
let status = $state<"idle" | "registering" | "uploading" | "done" | "error">("idle");
let message = $state("");

function onFileChange(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  file = input.files?.[0] ?? null;
  message = "";
  if (!file) {
    status = "idle";
  }
}

function onModeChange(mode: InputMode) {
  inputMode = mode;
  message = "";
  status = "idle";
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    clipboardText = text;
    message = "";
    if (!clipboardFilename) {
      clipboardFilename = `clipboard-${Date.now()}.txt`;
    }
  } catch {
    status = "error";
    message = "クリップボードの読み取りに失敗しました。";
  }
}

function resetInputs() {
  file = null;
  clipboardText = "";
  clipboardFilename = "";
  if (fileInput) {
    fileInput.value = "";
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const handleEnhance = (form: HTMLFormElement) =>
  enhance(form, ({ formData, cancel }) => {
    if (inputMode === "file") {
      if (!file) {
        cancel();
        status = "error";
        message = "ファイルを選択してください。";
        return;
      }
      formData.set("filename", file.name);
      formData.set("contentType", file.type || "text/plain");
    } else {
      if (!clipboardText) {
        cancel();
        status = "error";
        message = "クリップボードのテキストを取得してください。";
        return;
      }
      if (!clipboardFilename) {
        cancel();
        status = "error";
        message = "ファイル名を入力してください。";
        return;
      }
      formData.set("filename", clipboardFilename);
      formData.set("contentType", "text/plain");
    }
    status = "registering";

    return async ({ result }) => {
      if (result.type !== "success") {
        status = "error";
        const errorFromAction =
          result.type === "failure" ? asString((result.data as any)?.error) : undefined;
        message = errorFromAction ?? "登録に失敗しました。";
        return;
      }

      const uploadUrl = asString((result.data as any)?.uploadUrl);
      if (!uploadUrl) {
        status = "error";
        message = "アップロードURLの取得に失敗しました。";
        return;
      }

      status = "uploading";
      message = "アップロード中...";

      const body = inputMode === "file" ? file : new Blob([clipboardText], { type: "text/plain" });

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": inputMode === "file" ? file?.type || "text/plain" : "text/plain",
        },
        body,
      });

      if (!response.ok) {
        status = "error";
        message = `アップロードに失敗しました (${response.status})`;
        return;
      }

      status = "done";
      message = "アップロードが完了しました。処理の反映まで少しお待ちください。";
      resetInputs();
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
    <div class="segment">
      <button
        type="button"
        class:active={inputMode === 'file'}
        onclick={() => onModeChange('file')}
      >
        ファイル
      </button>
      <button
        type="button"
        class:active={inputMode === 'clipboard'}
        onclick={() => onModeChange('clipboard')}
      >
        クリップボード
      </button>
    </div>

    {#if inputMode === 'file'}
      <label class="field">
        <span>テキストファイル</span>
        <input
          bind:this={fileInput}
          type="file"
          name="file"
          accept=".txt,text/plain"
          onchange={onFileChange}
        />
      </label>
    {:else}
      <label class="field">
        <span>ファイル名</span>
        <input
          class="input"
          type="text"
          placeholder="clipboard.txt"
          bind:value={clipboardFilename}
        />
      </label>
      <div class="clipboard">
        <button type="button" class="ghost" onclick={pasteFromClipboard}>
          クリップボードから貼り付け
        </button>
        <span class="muted">文字数: {charCount}</span>
      </div>
    {/if}

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
    padding: 24px;
    @media (width < 960px) {
      padding-left: 16px;
      padding-right: 16px;
    }
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

  .segment {
    display: flex;
    gap: 8px;
    background: #f4efe7;
    padding: 4px;
    border-radius: 999px;
    width: fit-content;
  }

  .segment button {
    border: none;
    background: transparent;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    color: #6b645c;
  }

  .segment button.active {
    background: #1d1d1d;
    color: #fff;
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

  .input {
    border-radius: 12px;
    border: 1px solid #ded6cc;
    padding: 10px 12px;
    font-size: 14px;
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

  .clipboard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .ghost {
    border: 1px solid #d8d0c6;
    background: transparent;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    color: #5b4b32;
  }

  .muted {
    color: #6b645c;
    font-size: 12px;
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
