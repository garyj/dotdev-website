<script lang="ts">
	import type { LayoutProps } from './$types';
	import '@fontsource-variable/archivo/wdth.css';
	import archivo from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
	import '../app.css';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="preload" href={archivo} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

{@render children()}
