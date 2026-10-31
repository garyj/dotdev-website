<script lang="ts">
	import { onMount } from 'svelte';
	import { BIO, EMAIL, LINKS, TAGLINE } from '#lib/content.ts';
	import { startMarket } from '#lib/market.ts';

	let hero: HTMLElement;
	let canvas: HTMLCanvasElement;

	onMount(() => startMarket(hero, canvas));
</script>

<svelte:head>
	<title>Gary Jarrel: garyj.dev</title>
	<meta name="description" content="Gary Jarrel. {TAGLINE}" />
</svelte:head>

<main>
	<section class="hero" bind:this={hero} aria-labelledby="name">
		<canvas bind:this={canvas} aria-hidden="true"></canvas>

		<div class="top">
			<p class="mark" data-clear>garyj.dev</p>
			<p class="hint" data-clear>
				A made-up leasing market.
				<span class="hint-fine">Move to add demand. Click to sign a lease.</span>
				<span class="hint-touch">Tap to sign a lease.</span>
			</p>
		</div>

		<div class="intro" data-clear>
			<h1 id="name">Gary Jarrel</h1>
			<p class="tagline">{TAGLINE}</p>
			<ul class="links">
				{#each LINKS as link (link.href)}
					<li><a href={link.href} rel={link.href.startsWith('http') ? 'me' : undefined}>{link.label}</a></li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="about" aria-labelledby="about">
		<h2 id="about">About</h2>
		<div class="about-body">
			<p>{BIO}</p>
			<a class="email" href="mailto:{EMAIL}">{EMAIL}</a>
		</div>
	</section>
</main>

<style>
	.hero {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 100svh;
		min-height: max(100svh, 34rem);
		padding: var(--gutter);
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

	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem 2rem;
	}

	.mark {
		font-size: 1.0625rem;
		font-weight: 700;
		font-stretch: 112%;
		letter-spacing: -0.01em;
	}

	.hint {
		max-width: 22rem;
		color: var(--ink-soft);
		font-size: 0.875rem;
		line-height: 1.45;
	}

	.hint-touch {
		display: none;
	}

	@media (hover: none), (pointer: coarse) {
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

	.intro {
		grid-row: 3;
		justify-self: start;
		max-width: min(100%, 46rem);
	}

	h1 {
		font-size: clamp(2.6rem, 12.6vw, 6rem);
		font-weight: 800;
		font-stretch: 116%;
		line-height: 0.92;
		letter-spacing: -0.035em;
		margin-left: -0.04em;
	}

	.tagline {
		max-width: 31ch;
		margin-top: clamp(1rem, 2vw, 1.5rem);
		font-size: clamp(1.1875rem, 1.75vw, 1.5rem);
		line-height: 1.4;
		font-weight: 450;
		text-wrap: balance;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
		margin-top: clamp(1.25rem, 2.6vw, 2rem);
		padding: 0;
		list-style: none;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.links a {
		display: inline-block;
		padding-block: 0.25rem;
	}

	.about {
		display: grid;
		gap: 1.25rem;
		padding: clamp(4rem, 10vw, 8.5rem) var(--gutter) clamp(4rem, 9vw, 7.5rem);
	}

	h2 {
		font-size: 1.0625rem;
		font-weight: 700;
		font-stretch: 112%;
		letter-spacing: -0.01em;
		padding-top: 0.45rem;
	}

	.about-body p {
		max-width: 34em;
		font-size: clamp(1.1875rem, 1.9vw, 1.625rem);
		line-height: 1.48;
		text-wrap: pretty;
	}

	.email {
		display: inline-block;
		margin-top: clamp(2.5rem, 5vw, 4rem);
		font-size: clamp(1.5rem, 4.6vw, 3.25rem);
		font-weight: 750;
		font-stretch: 110%;
		letter-spacing: -0.025em;
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	@media (min-width: 48rem) {
		.about {
			grid-template-columns: minmax(10rem, 1fr) 3fr;
			gap: 2rem;
		}
	}
</style>
