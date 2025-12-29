<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const jobs = data.jobs;
</script>

<section class="page">
  <div class="page-header">
    <h1>My Files</h1>
    <a class="new-link" href="/files/new">ファイル登録</a>
  </div>

  {#if data.error}
    <div class="error">{data.error}</div>
  {/if}

  {#if jobs.length === 0}
    <p class="empty">ファイルがありません。</p>
  {:else}
    <div class="table">
      <div class="row header">
        <div>Filename</div>
        <div>Status</div>
        <div>Updated</div>
      </div>
      {#each jobs as job}
        <div class="row">
          <div class="filename">{job.filename ?? job.sk}</div>
          <div class="status">{job.status ?? '-'}</div>
          <div class="updated">{job.updatedAt ?? '-'}</div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .page {
    display: grid;
    gap: 16px;
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

  .table {
    display: grid;
    border: 1px solid #e5e0d9;
    border-radius: 12px;
    overflow: hidden;
    background: #ffffff;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(180px, 1.4fr) 120px 160px;
    gap: 12px;
    padding: 12px 16px;
    align-items: center;
    border-top: 1px solid #f0ebe5;
    font-size: 14px;
  }

  .row.header {
    font-weight: 600;
    background: #faf7f2;
    border-top: none;
  }

  .filename {
    word-break: break-word;
  }

  @media (max-width: 640px) {
    .row {
      grid-template-columns: 1fr;
      gap: 4px;
    }

    .row.header {
      display: none;
    }
  }
</style>
