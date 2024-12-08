<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { flyAndScale } from '$lib/utils/transitions';
	import { getContext } from 'svelte';
  import { onMount, createEventDispatcher } from 'svelte';
	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import DocumentArrowUpSolid from '$lib/components/icons/DocumentArrowUpSolid.svelte';
	import Switch from '$lib/components/common/Switch.svelte';
	import GlobeAltSolid from '$lib/components/icons/GlobeAltSolid.svelte';
	import { config } from '$lib/stores';
	import WrenchSolid from '$lib/components/icons/WrenchSolid.svelte';

	const i18n = getContext('i18n');

	export let uploadFilesHandler: Function;

	export let selectedToolIds: string[] = [];
	export let webSearchEnabled: boolean;

	export let tools = {};
	export let onClose: Function;

	$: tools = Object.fromEntries(
		Object.keys(tools).map((toolId) => [
			toolId,
			{
				...tools[toolId],
				enabled: selectedToolIds.includes(toolId)
			}
		])
	);

	let show = false;
  onMount(() => {
    fetchMenuItems();
  });



  // Initialiser un tableau vide pour menuItems
  export let menuItems = [];
    // Fonction pour charger les données de l'API
    async function fetchMenuItems() {
    try {
      const response = await fetch('http://localhost:3003/api/themes'); // URL de votre API
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();

      // Mapper les données reçues au format attendu pour menuItems
      menuItems = data.map(theme => ({
        id: theme.id,
        label: theme.label,
        icon: theme.icon || '', // Utiliser une valeur par défaut si icon est vide
        iconSize: { width: '22px', height: '19px' }
      }));
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  }




  // Update tools state with enabled status
  $: tools = Object.fromEntries(
    Object.keys(tools).map((toolId) => [
      toolId,
      {
        ...tools[toolId],
        enabled: selectedToolIds.includes(toolId)
      }
    ])
  );
  const dispatch = createEventDispatcher(); // Initialize the event dis
  export let selectedNameex: string;
 // Function to handle click and pass the selected name to the parent
 function handleClick(selectedName: string) {
   selectedNameex=selectedName;
   dispatch('selectName', selectedNameex);

  }

</script>

<Dropdown
  bind:show
  on:change={(e) => {
    if (e.detail === false) {
      onClose();
    }
  }}
>
  <Tooltip content={$i18n.t('Themes')}>
    <slot />
  </Tooltip>

  <div slot="content">
    <DropdownMenu.Content
      class="w-full max-w-[200px] rounded-xl px-1 py-1 border-gray-300/30 dark:border-gray-700/50 z-50 bg-white dark:bg-gray-850 dark:text-white shadow"
      sideOffset={15}
      alignOffset={-8}
      side="top"
      align="start"
      transition={flyAndScale}
    >
      {#if Object.keys(tools).length > 0}
        <div class="max-h-28 overflow-y-auto scrollbar-hidden">
          {#each Object.keys(tools) as toolId}
            <div class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-xl">
              <div class="flex-1 flex items-center gap-2">
                <WrenchSolid />
                <Tooltip content={tools[toolId]?.description ?? ''} class="flex-1">
                  <div class="line-clamp-1">{tools[toolId].name}</div>
                </Tooltip>
              </div>

              <Switch
                bind:state={tools[toolId].enabled}
                on:change={(e) => {
                  selectedToolIds = e.detail
                    ? [...selectedToolIds, toolId]
                    : selectedToolIds.filter((id) => id !== toolId);
                }}
              />
            </div>
          {/each}
        </div>

        <hr class="border-gray-100 dark:border-gray-800 my-1" />
      {/if}

      {#if $config?.features?.enable_web_search}
        <div class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-xl">
          <div class="flex-1 flex items-center gap-2">
            <GlobeAltSolid />
            <div class="line-clamp-1">{$i18n.t('Web Search')}</div>
          </div>

          <Switch bind:state={webSearchEnabled} />
        </div>

        <hr class="border-gray-100 dark:border-gray-800 my-1" />
      {/if}

      {#each menuItems as item}
      <DropdownMenu.Item
      class="flex gap-2 items-center px-3 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
      on:click={() => {
        handleClick(item.label);
        console.log(`${item.label} clicked`);
      }}
    >
      <!-- Tooltip wrapping the item content -->
      <Tooltip content={item.label}>
        <div class="flex items-center gap-2">
          <img
            src={item.icon}
            alt={`${item.label} Icon`}
            class="size-5"
            style="width: 22px; height: 19px;"
          />
          <div class="line-clamp-1">{$i18n.t(item.label)}</div>
        </div>
      </Tooltip>
    </DropdownMenu.Item>

      {/each}
    </DropdownMenu.Content>
  </div>
</Dropdown>