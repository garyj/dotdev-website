# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astro Aria - a minimalist portfolio/blog template built on Astro. Static site with blog posts (Markdown), projects showcase, and about page.

## Commands

```bash
pnpm dev          # Development server with hot reload
pnpm build        # Type check + production build (outputs to dist/)
pnpm preview      # Preview production build locally
pnpm check        # Run Biome linter/formatter with auto-fixes
```

**Node version:** 20 (see `.node-version`)
**Package manager:** pnpm

## Architecture

### Content System

- **Blog posts:** Markdown files in `src/content/post/` with frontmatter (title, description, dateFormatted)
- **Static data:** JSON files in `src/collections/` for menu, projects, experiences
- **Content schema:** Defined in `src/content/config.js` using Zod

### Page Routing

File-based routing in `src/pages/`:
- `index.astro` - Home with hero, featured projects/posts
- `posts.astro` - Blog listing
- `projects.astro` - Projects showcase
- `about.astro` - Bio and work history
- `post/[slug].astro` - Dynamic blog post pages via `getStaticPaths()`

### Layout Hierarchy

- `layouts/main.astro` - Base HTML shell, header, footer, dark mode init
- `layouts/post.astro` - Blog post wrapper with prose styling

### Dark Mode

- Toggle via `html.dark` class (Tailwind class strategy)
- Persisted in localStorage key `dark_mode`
- Inline script in `<head>` prevents flash-of-wrong-theme
- Toggle logic in `src/assets/js/main.js`

### Styling

- Tailwind-first with Typography plugin for prose
- Custom animations in `src/assets/css/main.css`
- Responsive breakpoints: mobile-first (sm:, md:, lg:, xl:)

### Client-side JavaScript

Minimal vanilla JS in `src/assets/js/main.js`:
- Sticky header on scroll
- Dark mode toggle
- Mobile menu
- Active menu highlighting

### Environment Variables

In `main.astro`:
- `import.meta.env.HEADER_INJECT` - Inject HTML in head
- `import.meta.env.FOOTER_INJECT` - Inject HTML before </body>

## Adding Content

**New blog post:** Create `src/content/post/slug.md` with frontmatter:
```yaml
---
layout: ../../layouts/post.astro
title: "Title"
description: "Description"
dateFormatted: "Dec 25, 2024"
---
```

**New project:** Add to `src/collections/projects.json`, image to `public/assets/images/projects/`

**Navigation:** Edit `src/collections/menu.json`

**Work experience:** Edit `src/collections/experiences.json`
