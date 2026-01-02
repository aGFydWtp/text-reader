<script lang="ts">
import { onMount } from "svelte";
import { deserialize } from "$app/forms";
import { formatJst } from "$lib/utils/date";

const {
  job,
  formDataStarted,
}: {
  job: { filename?: string; id: string; status?: string; updatedAt?: string | number };
  formDataStarted: boolean;
} = $props();

let filename = $state("");
let filenameDirty = $state(false);
let filenameNotice = $state<{ type: "success" | "error"; message: string } | null>(null);

onMount(() => {
  filename = job.filename ?? "";
});

async function saveFilename() {
  if (!filenameDirty) return;

  const trimmed = filename.trim();
  if (!trimmed) {
    filenameNotice = { type: "error", message: "ファイル名を入力してください。" };
    return;
  }

  const formData = new FormData();
  formData.set("filename", trimmed);

  const response = await fetch("?/updateFilename", {
    method: "POST",
    headers: {
      accept: "application/json",
      "x-sveltekit-action": "true",
    },
    body: formData,
  });

  const result = deserialize(await response.text());
  if (result.type === "failure") {
    filenameNotice = {
      type: "error",
      message: (result.data as { error?: string })?.error ?? "保存に失敗しました。",
    };
    return;
  }

  if (result.type === "success") {
    filenameNotice = { type: "success", message: "保存しました。" };
    filename = trimmed;
    filenameDirty = false;
    return;
  }

  filenameNotice = { type: "error", message: "保存に失敗しました。" };
}

function statusTone(status?: string) {
  if (formDataStarted) {
    return "progress";
  }

  switch (status) {
    case "COMPLETED":
      return "done";
    case "FAILED":
      return "error";
    case "TTS_STARTED":
      return "progress";
    default:
      return "neutral";
  }
}
</script>

<header class="hero">
  <div class="hero-main">
    <a class="back" href="/">一覧へ戻る</a>
    <input
      class="title-input"
      type="text"
      bind:value={filename}
      oninput={() => {
        filenameDirty = true;
        filenameNotice = null;
      }}
      onblur={saveFilename}
    />
    {#if filenameNotice?.type === "error"}
      <p class="notice error">{filenameNotice.message}</p>
    {:else if filenameNotice?.type === "success"}
      <p class="notice">{filenameNotice.message}</p>
    {/if}
    <div class="meta">
      <span class={`pill ${statusTone(job.status)}`}>
        {formDataStarted ? "TTS_STARTED" : job.status ?? "UNKNOWN"}
      </span>
      <span class="time">{formatJst(job.updatedAt)}</span>
    </div>
  </div>
</header>

<style>
  .hero {
    padding: 8px 0 0;
  }

  .hero-main {
    display: grid;
    gap: 8px;
  }

  .back {
    font-size: 13px;
    text-decoration: none;
    color: #5b4b32;
  }

  .title-input {
    font-size: 22px;
    font-weight: 600;
    border: none;
    background: transparent;
    padding: 0;
    color: #1d1d1d;
  }

  .title-input:focus {
    outline: 2px solid #1d1d1d;
    outline-offset: 4px;
    border-radius: 6px;
  }

  .notice {
    font-size: 12px;
  }

  .notice.error {
    color: #9c2c12;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .time {
    font-size: 12px;
    color: #6b645c;
  }

  .pill {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #f3eee7;
    color: #5b4b32;
  }

  .pill.done {
    background: #e4f1e6;
    color: #1d5a34;
  }

  .pill.progress {
    background: #fff4dc;
    color: #8a5a12;
  }

  .pill.error {
    background: #ffe6e0;
    color: #9c2c12;
  }
</style>
