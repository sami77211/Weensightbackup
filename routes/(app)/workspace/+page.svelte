<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {user} from '$lib/stores';

	onMount(() => {
		if ($user.role === "admin" || $user.role === "expert") {
    goto('/workspace/models');
} else if ($user.role === "user"|| $user.role === "RH" || $user.role === "Marketing" ) {
    goto('/workspace/documents');
}
	})


</script>
