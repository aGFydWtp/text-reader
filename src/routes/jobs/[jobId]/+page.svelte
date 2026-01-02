<script lang="ts">
import { formatJst } from "$lib/utils/date";
import type { PageData } from "./$types";
import DictEditor from "./DictEditor.svelte";

const { data, form }: { data: PageData; form: any } = $props();
let entries = $state<{ key: string; value: string }[]>([]);

const formDataStarted = $derived<boolean>(Boolean(form?.started) ?? false);

$effect(() => {
  entries = data.dictEntries.map((entry) => ({ ...entry }));
});

function statusTone({ status, formDataStarted }: { status?: string; formDataStarted: boolean }) {
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

<section class="page">
  <header class="hero">
    <div class="hero-main">
      <a class="back" href="/">一覧へ戻る</a>
      <h1>{data.job.filename ?? data.job.id}</h1>
      <div class="meta">
        <span class={`pill ${statusTone({status:data.job.status, formDataStarted})}`}>
          {formDataStarted ? 'TTS_STARTED' : data.job.status ?? 'UNKNOWN'}
        </span>
        <span class="time">{formatJst(data.job.updatedAt)}</span>
      </div>
    </div>
  </header>

  {#if data.job.status === 'FAILED' && data.job.errorMessage}
    <div class="card alert">
      <h2>失敗理由</h2>
      <p>{data.job.errorMessage}</p>
    </div>
  {/if}

  <div class="card">
    <h2>再生</h2>
    {#if data.audioUrl}
      <audio controls src={data.audioUrl} preload="none"></audio>
    {:else}
      <p class="muted">音声がまだ生成されていません。</p>
    {/if}
  </div>

  <form class="card" method="post" action="?/update">
    <DictEditor bind:entries />
    <button class="primary" type="submit">設定を保存</button>
    {#if form?.error}
      <p class="notice error">{form.error}</p>
    {:else if form?.warning}
      <p class="notice warning">保存しました。再生成の開始に失敗しました: {form.warning}</p>
    {:else if form?.started}
      <p class="notice">保存しました。再生成を開始しました。</p>
    {:else if form?.success}
      <p class="notice">保存しました。</p>
    {/if}
  </form>
</section>

<style>
  .page {
    display: grid;
    gap: 16px;
    padding: 24px;
    @media (width < 960px) {
      padding-left: 16px;
      padding-right: 16px;
    }
  }

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

  h1 {
    font-size: 22px;
    font-weight: 600;
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

  .card {
    background: #fffdf8;
    border: 1px solid #e5e0d9;
    border-radius: 16px;
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .card.alert {
    background: #fff3f0;
    border-color: #f1c7ba;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .muted {
    color: #6b645c;
    font-size: 13px;
  }

  audio {
    width: 100%;
  }

  .primary {
    border: none;
    border-radius: 999px;
    padding: 12px 16px;
    background: #1d1d1d;
    color: #fff;
    font-weight: 600;
  }

  .notice {
    font-size: 13px;
    color: #3f372e;
  }

  .notice.error {
    color: #9c2c12;
  }

  .notice.warning {
    color: #8a5a12;
  }

</style>
