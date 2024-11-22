<script lang="ts">
    export let prompt;
    export let onClick: () => void;
  </script>
  
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="flex cursor-pointer w-full px-3 py-2 dark:hover:bg-white/5 hover:bg-black/5 rounded-xl"
    on:click={onClick}
  >
    <div class="flex-1 self-center pl-5">
      <div class="font-semibold line-clamp-1">{prompt.command}</div>
      <div class="text-xs overflow-hidden text-ellipsis line-clamp-1">
        {prompt.title}
      </div>
    </div>
  </div>
  