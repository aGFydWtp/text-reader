<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const jobs = $derived(data.jobs);
</script>

<section class="page">
  <div class="page-header">
    <h1>My Files</h1>
    <a class="new-link" href="/jobs/new">ファイル登録</a>
  </div>

  {#if data.error}
    <div class="error">{data.error}</div>
  {/if}

  {#if jobs.length === 0}
    <p class="empty">ファイルがありません。</p>
  {:else}
    <div class="card-list">
      {#each jobs as job}
        <a class="card" href={`/jobs/${job.jobId}`}>
          <div class="card-head">
            <div class="title">{job.filename ?? job.sk}</div>
            <span class={`pill ${job.status ?? 'neutral'}`}>{job.status ?? 'UNKNOWN'}</span>
          </div>
          <div class="meta">
            <span class="label">Updated</span>
            <span>{job.updatedAt ?? '-'}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>

<style>
  .page {
    display: grid;
    gap: 16px;
    padding: 24px;
  }

  h1 {
    font-size: 24px;
    font-weight: 600;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .new-link {
    font-size: 14px;
    text-decoration: none;
    color: #5b4b32;
  }

  .error {
    padding: 12px 16px;
    background: #fff3f0;
    border: 1px solid #f1c7ba;
    border-radius: 8px;
    color: #9c2c12;
  }

  .empty {
    color: #6b645c;
  }

  .card-list {
    display: grid;
    gap: 12px;
  }

  .card {
    display: grid;
    gap: 10px;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid #e5e0d9;
    background: #fffdf8;
    text-decoration: none;
    color: inherit;
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    word-break: break-word;
  }

  .meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: #6b645c;
  }

  .label {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 10px;
  }

  .pill {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #f3eee7;
    color: #5b4b32;
    text-transform: uppercase;
  }

  .pill.COMPLETED {
    background: #e4f1e6;
    color: #1d5a34;
  }

  .pill.TTS_STARTED {
    background: #fff4dc;
    color: #8a5a12;
  }

  .pill.FAILED {
    background: #ffe6e0;
    color: #9c2c12;
  }
</style>
