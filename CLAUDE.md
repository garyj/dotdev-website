# CLAUDE.md

garyj.dev: one static page built with SvelteKit 3 and Svelte 5 (runes).

## Commands

```bash
pnpm dev      # Dev server with hot reload
pnpm build    # Prerender the site to build/
pnpm check    # svelte-check type check
pnpm preview  # Serve the production build locally
```

Node 24 (`.node-version`; SvelteKit 3 needs >=22.17). Package manager: pnpm (`packageManager` in `package.json`).

## Layout

- `src/routes/+page.svelte`: the page, including its `<title>` and meta description.
- `src/routes/+layout.ts`: `export const prerender = true`, so the whole site is static.
- `src/app.html`: HTML shell.
- `static/`: files served as-is from `/` (`favicon.png`, `robots.txt`).
- `vite.config.ts`: SvelteKit plugin config with `@sveltejs/adapter-static`. There is no `svelte.config.js`.

No CSS framework, linter, or test suite is installed.

## Deploy

`.github/workflows/ci.yml` runs on push to `main`: `pnpm build`, then `wrangler pages deploy build` to Cloudflare Pages project `garyj-dot-dev`, whose production branch is `main`.

- Preview any other branch with `gh workflow run ci.yml --ref <branch>`. It deploys to `<branch>.garyj-dot-dev.pages.dev` and leaves garyj.dev alone.
- The deploy job has no checkout step on purpose. With `pnpm-lock.yaml` present, `wrangler-action` tries to install Wrangler with pnpm, which that job does not set up.
