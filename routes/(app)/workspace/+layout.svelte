<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { WEBUI_NAME, showSidebar, functions, user } from '$lib/stores';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import MenuLines from '$lib/components/icons/MenuLines.svelte';

	const i18n = getContext('i18n');

	let loaded = false;

	onMount(async () => {
	/*	if ($user?.role !== 'admin') {
			await goto('/');
		}*/
		loaded = true;
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Workspace')} | {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<div
		class="flex flex-col w-full min-h-screen max-h-screen  {$showSidebar
			? 'md:max-w-[calc(100%-260px)]'
			: ''} bg-light-green"
	>
		<div class="px-4 pt-3 mt-0.5 mb-1 header">
			<div class="flex items-center gap-1">
				<div class="{$showSidebar ? 'md:hidden' : ''} mr-1 self-start flex flex-none items-center">
					<button
						id="sidebar-toggle-button"
						class="cursor-pointer p-1 flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
						on:click={() => {
							showSidebar.set(!$showSidebar);
						}}
					>
						<div class="m-auto self-center">
							<MenuLines />
						</div>
					</button>
				</div>
				<div class="flex items-center text-xl font-semibold">{$i18n.t('Workspace')}</div>
			</div>
		</div>

		<div class="px-4 my-1 header">
			<div
				class="flex scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium rounded-xl bg-transparent/10 p-1"
			> {#if $user.role==='admin'||$user.role==='expert'}
				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/workspace/models')
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/workspace/models">{$i18n.t('Models')}</a
				>
				
				{/if}

				{#if $user.role==='admin'||$user.role==='expert'}
				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/workspace/prompts')
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/workspace/prompts">{$i18n.t('Prompts')}</a
				>
				{/if}
				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes(
						'/workspace/documents'
					)
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/workspace/documents"
				>
					{$i18n.t('Documents')}
				</a>

				{#if $user.role==='admin'||$user.role==='expert'}

				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/workspace/tools')
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/workspace/tools"
				>
					{$i18n.t('Tools')}
				</a>
				{/if}

				{#if $user.role==='Marketing' || $user.role==='admin'}
				<a
				class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/workspace/RH')
					? 'bg-dark-green text-white'
					: ''} transition"
				href="/workspace/RH"
			>
				{$i18n.t('Marketing')}
			</a>
			{/if}
			{#if $user.role==='RH' || $user.role==='admin'}

				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/workspace/functions')
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/workspace/functions"
				>
					{$i18n.t('HR')}
				</a>
				{/if}
	
			</div>
		
		</div>

		<hr class="dark:border-gray-850 topmenu	" />

		<div class="py-1 px-5 flex-1 max-h-full overflow-y-auto BckColor">
			<slot />
		</div>
	</div>
{/if}

<style>


	/* Couleur de fond verte foncée pour l'élément sélectionné */
	.bg-dark-green {
		background-color: #9FD5B5; /* Vert foncé */
	}

	/* Désactiver la scrollbar */
	.tabs::-webkit-scrollbar {
		display: none; /* Chrome, Safari, Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE et Edge */
		scrollbar-width: none; /* Firefox */
	}
	.header{

	 background-color: white;
	}
	.BckColor{

		background-color: #f1fdf9;
	}

	.topmenu{
		margin-top: 10px;
	}
</style>
