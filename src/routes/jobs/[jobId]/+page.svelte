<script lang="ts">
import type { PageData } from "./$types";
import DictEditor from "./DictEditor.svelte";
import JobTitle from "./JobTitle.svelte";

const { data, form }: { data: PageData; form: any } = $props();
let entries = $state<{ key: string; value: string }[]>([]);

const formDataStarted = $derived<boolean>(Boolean(form?.started) ?? false);

$effect(() => {
  entries = data.dictEntries.map((entry) => ({ ...entry }));
});
</script>

<section class="page">
  <JobTitle job={data.job} formDataStarted={formDataStarted} />
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

  <form class="card" method="post" action="?/updateSetting">
    <DictEditor bind:entries />
    <button class="primary" type="submit">設定を保存</button>
    {#if form?.action === "updateSetting" && form?.error}
      <p class="notice error">{form.error}</p>
    {:else if form?.action === "updateSetting" && form?.warning}
      <p class="notice warning">保存しました。再生成の開始に失敗しました: {form.warning}</p>
    {:else if form?.action === "updateSetting" && form?.started}
      <p class="notice">保存しました。再生成を開始しました。</p>
    {:else if form?.action === "updateSetting" && form?.success}
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
