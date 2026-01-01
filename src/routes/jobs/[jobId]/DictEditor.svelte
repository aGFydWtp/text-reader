<script lang="ts">
  type Entry = { key: string; value: string };

  let { entries = $bindable<Entry[]>([]) } = $props();

  function addRow() {
    entries = [...entries, { key: '', value: '' }];
  }

  function removeRow(index: number) {
    if (entries.length === 1) {
      entries = [{ key: '', value: '' }];
      return;
    }
    entries = entries.filter((_, idx) => idx !== index);
  }
</script>

<div class="dict-header">
    <h2>読み上げ設定</h2>
    <p class="muted">単語の読み替えを登録できます。</p>
</div>

<div class="dict-list">
  {#each entries as entry, index (index)}
    <div class="dict-row">
      <div class="dict-fields">
        <input
          class="input"
          name="dictKey"
          placeholder="元の単語"
          bind:value={entry.key}
        />
        →
        <input
          class="input"
          name="dictValue"
          placeholder="読み替え"
          bind:value={entry.value}
        />
        <button class="remove" type="button" onclick={() => removeRow(index)}>削除</button>
      </div>
    </div>
  {/each}
  <button class="ghost" type="button" onclick={addRow}>追加</button>
</div>

<style>
  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .dict-list {
    display: grid;
    gap: 10px;
  }

  .dict-row {
    display: grid;
    gap: 8px;
    border: 1px solid #efe7dd;
    border-radius: 12px;
    padding: 10px;
    background: #fff;
  }

  .dict-fields {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input {
    border-radius: 12px;
    border: 1px solid #ded6cc;
    padding: 10px 12px;
    font-size: 16px;
    background: #fff;
    flex: 1;
  }

  .ghost {
    border: 1px solid #d8d0c6;
    background: transparent;
    border-radius: 999px;
    padding: 12px 16px;
    font-size: 12px;
    color: #5b4b32;
    cursor: pointer;
  }

  .remove {
    border: none;
    background: #f7efe6;
    color: #5b4b32;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12px;
    text-wrap: nowrap;
  }

  .muted {
    color: #6b645c;
    font-size: 13px;
  }
</style>
