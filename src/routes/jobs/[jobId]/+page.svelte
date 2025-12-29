<script lang="ts">
  import type { PageData } from './$types';

  let { data, form }: { data: PageData; form: any } = $props();
  let entries = data.dictEntries;

  function addRow() {
    entries = [...entries, { key: '', value: '' }];
  }

  function statusTone(status?: string) {
    switch (status) {
      case 'COMPLETED':
        return 'done';
      case 'FAILED':
        return 'error';
      case 'TTS_STARTED':
        return 'progress';
      default:
        return 'neutral';
    }
  }
</script>

<section class="page">
  <header class="hero">
    <div class="hero-main">
      <a class="back" href="/">一覧へ戻る</a>
      <h1>{data.job.filename ?? data.job.id}</h1>
      <div class="meta">
        <span class={`pill ${statusTone(data.job.status)}`}>
          {data.job.status ?? 'UNKNOWN'}
        </span>
        <span class="time">{data.job.updatedAt ?? '-'}</span>
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
    <h2>音声プレビュー</h2>
    {#if data.audioUrl}
      <audio controls src={data.audioUrl} preload="none"></audio>
    {:else}
      <p class="muted">音声がまだ生成されていません。</p>
    {/if}
  </div>

  <form class="card" method="post" action="?/updateDict">
    <div class="card-header">
      <div>
        <h2>読み上げ設定</h2>
        <p class="muted">単語の読み替えを登録できます。</p>
      </div>
      <button class="ghost" type="button" on:click={addRow}>追加</button>
    </div>

    <div class="dict-list">
      {#each entries as entry, index (index)}
        <div class="dict-row">
          <input
            class="input"
            name="dictKey"
            placeholder="元の単語"
            bind:value={entry.key}
          />
          <input
            class="input"
            name="dictValue"
            placeholder="読み替え"
            bind:value={entry.value}
          />
        </div>
      {/each}
    </div>

    <button class="primary" type="submit">設定を保存</button>
    {#if form?.error}
      <p class="notice error">{form.error}</p>
    {:else if form?.success}
      <p class="notice">保存しました。</p>
    {/if}
  </form>
</section>

<style>
  .page {
    display: grid;
    gap: 16px;
    padding-bottom: 24px;
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

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .dict-list {
    display: grid;
    gap: 10px;
  }

  .dict-row {
    display: grid;
    gap: 8px;
  }

  .input {
    border-radius: 12px;
    border: 1px solid #ded6cc;
    padding: 10px 12px;
    font-size: 14px;
    background: #fff;
  }

  .primary {
    border: none;
    border-radius: 999px;
    padding: 12px 16px;
    background: #1d1d1d;
    color: #fff;
    font-weight: 600;
  }

  .ghost {
    border: 1px solid #d8d0c6;
    background: transparent;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12px;
    color: #5b4b32;
  }

  .notice {
    font-size: 13px;
    color: #3f372e;
  }

  .notice.error {
    color: #9c2c12;
  }
</style>
