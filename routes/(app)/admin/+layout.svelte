<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';

	import { WEBUI_NAME, showSidebar, user } from '$lib/stores';
	import MenuLines from '$lib/components/icons/MenuLines.svelte';
	import { page } from '$app/stores';

	const i18n = getContext('i18n');

	let loaded = false;

	onMount(async () => {
		/*if ($user?.role !== 'admin') {
			await goto('/');
		}*/
		loaded = true;
	});
</script>

<svelte:head>
	<title>
		
		{$i18n.t('Admin Panel')} | {$WEBUI_NAME}
		
	

	</title>
</svelte:head>

{#if loaded}
	<div
		class="flex flex-col w-full min-h-screen max-h-screen {$showSidebar
			? 'md:max-w-[calc(100%-260px)]'
			: ''} header"
	>
		<div class="px-4 pt-3 mt-0.5 mb-1 header">
			<div class="flex items-center gap-1 ">
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
				{#if $user.role==='admin' }
				<div class="flex items-center text-xl font-semibold">{$i18n.t('Admin Panel')}</div>
				{/if}
				{#if $user.role==='expert' }
				<div class="flex items-center text-xl font-semibold">{$i18n.t('Expert Panel')}</div>
				{/if}
			</div>
		</div>

		<div class="px-4 my-1 ">
			<div
				class="flex scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium rounded-xl bg-transparent/10 p-1"
			>
			{#if  $user.role==='admin'}
				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {['/admin', '/admin/'].includes($page.url.pathname)
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/admin">{$i18n.t('Dashboard')}</a
				>
				{/if}

{#if $user.role==='expert' || $user.role==='admin'}
				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/admin/settings')
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/admin/settings">{$i18n.t('Settings')}</a
				>
				{/if}


				<a
				class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/admin/Collection')
				  ? 'bg-dark-green text-white'
				  : ''} transition"
				href="/admin/Collection"
			  >{$i18n.t('Collections')}</a>
			  {#if $user.role==='expert' || $user.role==='admin'}
			  <a
                class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/admin/Expert')
                        ? 'bg-dark-green text-white'
                        : ''} transition"
                href="/admin/Expert">{$i18n.t('Expert')}</a
                >
				{/if}

				{#if $user.role==='admin' }
				
			  <a
			  class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/admin/Group')
					  ? 'bg-dark-green text-white'
					  : ''} transition"
			  href="/admin/Group">{$i18n.t('Roles')}</a
			  >
			  {/if}
			  

				<!-- Commented out options -->
				<!--
				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/workspace/documents')
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/workspace/documents"
				>
					{$i18n.t('Documents')}
				</a>

				<a
					class="min-w-fit rounded-lg p-1.5 px-3 {$page.url.pathname.includes('/workspace/playground')
						? 'bg-dark-green text-white'
						: ''} transition"
					href="/workspace/playground">{$i18n.t('Playground')}</a
				-->
			</div>
		</div>

		<hr class="dark:border-gray-850 BckcoLor" />

		<div class="py-1 px-5 flex-1 max-h-full overflow-y-auto BckcoLor ">
			<slot />
		</div>
	</div>
{/if}

<style>
	/* Couleur de fond verte très claire pour le composant */
	.bg-light-green {
		background-color: rgba(144, 238, 144, 0.1); /* Vert très pâle avec une opacité plus faible */
	}

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
	
	.BckcoLor{
		background-color: #f1fdf9;
		
	}
</style>

