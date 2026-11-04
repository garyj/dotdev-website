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

`.github/workflows/ci.yml` runs on push to `main`, on pull requests into `main`, and by hand: `pnpm build`, then `wrangler pages deploy build` to Cloudflare Pages project `garyj-dot-dev`, whose production branch is `main`.

- Any other branch deploys as a preview to `<branch>.garyj-dot-dev.pages.dev` and leaves garyj.dev alone. A PR gets one automatically; for a branch without a PR, run `gh workflow run ci.yml --ref <branch>`.
- On PR runs the deploy uses `github.head_ref` and the PR head SHA, because `github.ref_name` there is `<n>/merge`. PRs only trigger when they target `main`, so a PR whose head is `main` can never deploy to production.
- The deploy job has no checkout step on purpose. With `pnpm-lock.yaml` present, `wrangler-action` tries to install Wrangler with pnpm, which that job does not set up.
