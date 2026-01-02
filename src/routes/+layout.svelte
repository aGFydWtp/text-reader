<script lang="ts">
import favicon from "$lib/assets/favicon.svg";
import "$lib/assets/reset.css";
import "$lib/assets/global.css";

let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<header class="app-header">
		<div class="brand">Text Reader</div>
		{#if data.user}
			<a class="logout" href="/logout">ログアウト</a>
		{/if}
	</header>
	<main class="app-main">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		min-height: 100dvh;
		background: #f7f5f2;
		color: #1d1d1d;
	}

	.app-header {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 24px;
		border-bottom: 1px solid #e5e0d9;
		background: #fffdf8;
		z-index: 10;
	}

	.brand {
		font-size: 18px;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.logout {
		font-size: 14px;
		color: #5b4b32;
		text-decoration: none;
	}

	.app-main {
		padding-top: 60px;
		max-width: 960px;
		margin: 0 auto;
	}
</style>
