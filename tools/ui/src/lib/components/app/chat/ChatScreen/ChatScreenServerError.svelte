<script lang="ts">
	import { AlertTriangle, Loader2, RefreshCw, Settings } from '@lucide/svelte';
	import { DialogSettingsChat } from '$lib/components/app/dialogs';
	import * as Alert from '$lib/components/ui/alert';
	import { ICON_CLASS_DEFAULT, MANAGED_API_KEY } from '$lib/constants';
	import { modelsStore, serverStore, settingsStore } from '$lib/stores';
	import { getApiKey } from '$lib/utils';

	let settingsOpen = $state(false);

	let hasError = $derived(!!serverStore.error);
	let isLoadingModel = $derived(serverStore.status === 503 && !serverStore.isExternal);

	// external API: point the user to the key, unless the deployment locks it
	let apiKeyHint = $derived.by(() => {
		if (!serverStore.isExternal || MANAGED_API_KEY) return null;

		// read config so the hint updates when the key changes
		void settingsStore.config.apiKey;

		if (!getApiKey()) {
			return 'No API key is set. Set your API key in Settings.';
		}

		if (serverStore.status === 401 || serverStore.status === 403) {
			return 'The API key was rejected. Check your API key in Settings.';
		}

		return null;
	});

	async function retry() {
		await serverStore.fetch();

		// external mode has no props change to trigger a model refresh
		if (serverStore.isExternal && !serverStore.error) {
			await modelsStore.fetch().catch(() => {});
		}
	}
</script>

{#if hasError}
	<div class="pointer-events-auto mx-auto mb-4 max-w-[48rem] px-1">
		<Alert.Root variant={isLoadingModel ? 'default' : 'destructive'}>
			{#if isLoadingModel}
				<Loader2 class="{ICON_CLASS_DEFAULT} animate-spin" />
			{:else}
				<AlertTriangle class={ICON_CLASS_DEFAULT} />
			{/if}

			<Alert.Title class="flex items-center justify-between">
				<span>{isLoadingModel ? 'Loading model' : 'Server unavailable'}</span>

				{#if !isLoadingModel}
					<div class="flex items-center gap-1.5">
						{#if apiKeyHint}
							<button
								class="flex items-center gap-1.5 rounded-lg bg-destructive/20 px-2 py-1 text-xs font-medium hover:bg-destructive/30"
								onclick={() => (settingsOpen = true)}
							>
								<Settings class="h-3 w-3" />
								Open settings
							</button>
						{/if}

						<button
							class="flex items-center gap-1.5 rounded-lg bg-destructive/20 px-2 py-1 text-xs font-medium hover:bg-destructive/30 disabled:opacity-50"
							disabled={serverStore.loading}
							onclick={retry}
						>
							<RefreshCw class="h-3 w-3 {serverStore.loading ? 'animate-spin' : ''}" />
							{serverStore.loading ? 'Retrying...' : 'Retry'}
						</button>
					</div>
				{/if}
			</Alert.Title>

			{#if !isLoadingModel}
				<Alert.Description>
					{#if apiKeyHint}
						<p class="font-medium">{apiKeyHint}</p>
					{/if}

					<p>{serverStore.error}</p>
				</Alert.Description>
			{/if}
		</Alert.Root>
	</div>
{/if}

<DialogSettingsChat bind:open={settingsOpen} />
