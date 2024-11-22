<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { WEBUI_NAME, showSidebar, functions } from '$lib/stores';
	import MenuLines from '$lib/components/icons/MenuLines.svelte';
	import { page } from '$app/stores';

	const i18n = getContext('i18n');

	onMount(async () => {});
</script>

<svelte:head>
	<title>
		{$i18n.t('Playground')} | {$WEBUI_NAME}
	</title>
</svelte:head>

<div
	class=" flex flex-col light-green-bg w-full min-h-screen max-h-screen {$showSidebar
		? 'md:max-w-[calc(100%-260px)]'
		: ''}"
>
<div class="px-4 pt-3 mt-0.5 mb-1 header" >
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
	  <div class="flex items-center text-xl font-semibold">{$i18n.t('Playground')}</div>
	</div>
  </div>
  
	<hr class="dark:border-gray-850" />


	<div class="py-1 px-5 flex-1 max-h-full overflow-y-auto BckColor">
		<slot />
	</div>
	
</div>
<style>
.light-green-bg {
    background-color: rgba(144, 238, 144, 0.1); /* Vert pâle avec une opacité plus faible */
}

div.BckColor {
    background-color:#f1fdf9 !important; /* Use !important to override other styles */
}
.header{
	background-color: white;
}


</style>