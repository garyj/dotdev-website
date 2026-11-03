<script lang="ts">
	import { onMount } from 'svelte';
	import { BIO, EMAIL, LINKS, TAGLINE } from '#lib/content.ts';
	import { startMarket } from '#lib/market.ts';

	let city: HTMLElement;
	let canvas: HTMLCanvasElement;

	onMount(() => startMarket(city, canvas));
</script>

<svelte:head>
	<title>Gary Jarrel: garyj.dev</title>
	<meta name="description" content="Gary Jarrel. {TAGLINE}" />
</svelte:head>

<main class="city" bind:this={city}>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>

	<header class="site name-site" data-clear>
		<h1>Gary Jarrel</h1>
		<p class="tagline">{TAGLINE}</p>
		<ul class="links">
			{#each LINKS as link (link.href)}
				<li><a href={link.href} rel={link.href.startsWith('http') ? 'me' : undefined}>{link.label}</a></li>
			{/each}
		</ul>
		<p class="hint">
			<strong>garyj.dev</strong> sits on a made-up leasing market.
			<span class="hint-fine">Move to add demand. Click to sign a lease.</span>
			<span class="hint-touch">Tap the map to sign a lease.</span>
		</p>
	</header>

	<section class="site bio-site" data-clear aria-labelledby="about">
		<h2 id="about" class="sr-only">About Gary</h2>
		<p class="bio">{BIO}</p>
		<a class="email" href="mailto:{EMAIL}">{EMAIL}</a>
	</section>
</main>

<style>
	.city {
		position: relative;
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: var(--gutter);
		align-content: start;
		min-height: 100svh;
		padding: var(--gutter) var(--gutter) clamp(9rem, 28vh, 16rem);
		overflow: hidden;
		isolation: isolate;
	}

	canvas {
		position: absolute;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
	}

	.site {
		justify-self: start;
		align-self: start;
		max-width: 100%;
	}

	.name-site {
		grid-column: 1 / -1;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(2.6rem, 12.6vw, 6rem);
		font-weight: 800;
		font-stretch: 116%;
		line-height: 0.92;
		letter-spacing: -0.035em;
		margin-left: -0.04em;
	}

	.tagline {
		max-width: 31ch;
		margin-top: clamp(0.875rem, 1.8vw, 1.375rem);
		font-size: clamp(1.1875rem, 1.75vw, 1.5rem);
		line-height: 1.4;
		font-weight: 450;
		text-wrap: balance;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
		margin-top: clamp(1rem, 2.2vw, 1.75rem);
		padding: 0;
		list-style: none;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.links a {
		display: inline-block;
		padding-block: 0.25rem;
	}

	.links li:nth-child(3) a {
		padding-inline: 0.25rem;
		margin-inline: -0.25rem;
	}

	.hint {
		max-width: 30rem;
		margin-top: clamp(1rem, 2vw, 1.5rem);
		color: var(--ink-soft);
		font-size: 0.875rem;
		line-height: 1.45;
	}

	.hint strong {
		color: var(--ink);
		font-weight: 700;
	}

	.hint-touch {
		display: none;
	}

	@media (hover: none) and (pointer: coarse) {
		.hint-fine {
			display: none;
		}
		.hint-touch {
			display: inline;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hint-fine,
		.hint-touch {
			display: none;
		}
	}

	.bio-site {
		grid-column: 1 / -1;
		width: 34rem;
		margin-top: clamp(14rem, 44svh, 22rem);
	}

	.bio {
		font-size: clamp(1.125rem, 1.45vw, 1.3125rem);
		line-height: 1.5;
		text-wrap: pretty;
	}

	.email {
		display: inline-block;
		margin-top: clamp(1.5rem, 3vw, 2.25rem);
		font-family: var(--font-display);
		font-size: clamp(1.375rem, 2.6vw, 2.125rem);
		font-weight: 750;
		font-stretch: 110%;
		letter-spacing: -0.02em;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	@media (min-width: 48rem) {
		.name-site {
			grid-column: 1 / span 10;
		}
		.bio-site {
			grid-column: 5 / -1;
			margin-top: clamp(9rem, 22vh, 13rem);
		}
	}

	@media (min-width: 64rem) {
		.name-site {
			grid-column: 1 / span 7;
		}
		.bio-site {
			grid-column: 8 / -1;
			grid-row: 1;
			margin-top: clamp(19rem, 46vh, 28rem);
		}
	}
</style>
