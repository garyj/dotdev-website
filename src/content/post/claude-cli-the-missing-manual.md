---
layout: ../../layouts/post.astro
title: "Claude Code Plugin CLI: The Missing Manual"
description: Discover the undocumented Claude Code CLI commands for managing plugins and marketplaces from your terminal - no REPL required.
dateFormatted: January 14, 2026
---

![Hero Image](./claude-cli-the-missing-manual-hero.png)

Claude Code for me is like a best friend at work, I use it in my daily coding work, and non coding tasks, like sorting supplier invoices, summarizing account payables, though I always verify its output, the productivity gains are huge.

More and more I find myself relying on [Claude Code plugins](https://code.claude.com/docs/en/discover-plugins) (skills, hooks, commands, etc). Commonly, I would write these myself partly as a learning exercise as it gets you thinking about the underlying mechanics of Claude Code, but also because I have specific needs that are not common to the Claude Code use case, yet work surprisingly well in Claude code. For example processing, summarizing and "Exelifying" (not a word) compliance documents in our Real Estate business.

Since October, when Anthropic released the plugin system for Claude Code, the number of publicly available plugins has skyrocketed. And, of course with new shiny tools comes the desire to try them.

After pushing past the anxiety of installing more untrusted code into my machine (subject for another post), I ran into an installation issue. As a native Linux user, I primarily work in the CLI and heavily rely on scripts, aliases, and various shortcuts. The Claude Code plugin installation didn't fit my workflow.

## The Problem

Claude Code's [plugin docs](https://code.claude.com/docs/en/discover-plugins#try-it:-add-the-demo-marketplace) primarily focuses on the use of the interactive `/plugin` commands which is used inside Claude Code REPL.

```bash
/plugin marketplace add anthropics/claude-code
/plugin install some-plugin@marketplace
```

This means I would have to:

1. Open Claude Code
2. Wait for it to initialise
3. Type the command
4. Restart Claude Code

This to me feels clunky, slow and "unmanaged". I wanted to manage plugins the same way I manage everything else on my system - from my terminal.

## The CLI Commands (That Actually Exist)

In the docs the `claude plugin install` command is [mentioned](https://code.claude.com/docs/en/discover-plugins#manage-installed-plugins) but nothing to manage the marketplaces. The section on the [Marketplace CLI](https://code.claude.com/docs/en/discover-plugins#use-cli-commands) at the time of writing still shows usage of `/plugin` command.

**Even `claude --help` doesn't mention the `marketplace` subcommand** On my installation (v2.1.6).

### Marketplace Commands

Undocumented

```bash
# Add a marketplace
claude plugin marketplace add <url-or-repo>

# List all marketplaces
claude plugin marketplace list

# Update a marketplace
claude plugin marketplace update <name>

# Remove a marketplace
claude plugin marketplace remove <name>
```

### Plugin Commands

Documented in 2 lines in the docs.

```bash
# Install a plugin (with optional scope)
claude plugin install <plugin>@<marketplace>
claude plugin install <plugin>@<marketplace> --scope project
claude plugin install <plugin>@<marketplace> --scope local

# Uninstall a plugin
claude plugin uninstall <plugin>

# Enable/disable a plugin
claude plugin enable <plugin>
claude plugin disable <plugin>
```

These commands allowed me easily to manage my Claude Code plugins from the terminal. I wanted to try [Jesse Vincent](https://github.com/obra)'s [Superpowers plugin](https://github.com/obra/superpowers):

```bash
claude plugin marketplace add https://github.com/obra/superpowers
claude plugin install superpowers@superpowers-marketplace
```

Simple and clean!

## Why Not Use Third-Party Tools?

When trying to find a solution I came across the [claude-plugins](https://github.com/Kamalnrf/claude-plugins) CLI community tools, which probably would have done the trick.

But my take: that is another package in my supply chain. Another thing I need to trust. Another thing that could be compromised via dependency confusion, typosquatting, etc. All too often I type `claud` missing the `e` at the end.

The official CLI commands come from Anthropic, the same trust boundary I have already accepted when I installed Claude Code.

## Making It Ergonomic

With the help of Claude Code I wrapped these commands in a [justfile](https://github.com/garyj/dotfiles/blob/master/home/dot_justfiles/claude.justfile) which forms part of my dotfiles config, this allows me to simply run:

```bash
just claude mpa <url>      # Add/update a marketplace
just claude mpr <name>     # Remove marketplace (and its plugins)
just claude mpup <name>    # Update a marketplace
just claude mpl            # List marketplaces

just claude pla <plugin>   # Install a plugin
just claude plr <plugin>   # Uninstall a plugin
just claude ple <plugin>   # Enable a plugin
just claude pld <plugin>   # Disable a plugin
just claude pll            # List installed plugins
```

The `mpa` command is idempotent - if the marketplace is already installed, it automatically updates instead of failing. Claude throws an error if you try to add a marketplace that already exists.

The `mpr` command removes all plugins from a marketplace before removing it, preventing orphans.

Here's the justfile:

```makefile
# add or update a marketplace
[group("plugins"), script("bash")]
mpa url:
    output=$(command claude plugin marketplace add "{{ url }}" 2>&1)
    if echo "$output" | grep -qi "already installed"; then
        name=$(echo "$output" | sed -n "s/.*Marketplace '\([^']*\)'.*/\1/p")
        echo "Already installed, will update instead: $name"
        just --justfile {{ justfile }} mpup "$name"
    else
        echo "$output"
    fi

# remove a marketplace (and its plugins)
[group("plugins"), script("bash")]
mpr name:
    # Find and remove all plugins from this marketplace
    plugins=$(jq -r '.plugins | keys[] | select(endswith("@{{ name }}")) | split("@")[0]' ~/.claude/plugins/installed_plugins.json 2>/dev/null)
    for plugin in $plugins; do
        echo "Removing plugin: $plugin"
        command claude plugin uninstall "$plugin" 2>&1 || true
    done
    # Remove the marketplace
    command claude plugin marketplace remove "{{ name }}"

# update a marketplace
[group("plugins")]
@mpup name:
    command claude plugin marketplace update "{{ name }}"

# list marketplaces
[group("plugins")]
@mpl:
    command claude plugin marketplace list

# add/install a plugin
[group("plugins")]
@pla plugin:
    command claude plugin install "{{ plugin }}"

# remove/uninstall a plugin
[group("plugins")]
@plr plugin:
    command claude plugin uninstall "{{ plugin }}"

# disable a plugin
[group("plugins")]
@pld plugin:
    command claude plugin disable "{{ plugin }}"

# enable a plugin
[group("plugins")]
@ple plugin:
    command claude plugin enable "{{ plugin }}"

# list installed plugins
[group("plugins")]
@pll:
    # why is there no `claude plugin list`? :(
    jq -r '.plugins | keys[] | split("@") | "\(.[0]) (from \(.[1]))"' ~/.claude/plugins/installed_plugins.json
```

## Get the Full Config

The complete justfile is part of my  [chezmoi](https://www.chezmoi.io/) managed [dotfiles](https://github.com/garyj/dotfiles/blob/master/home/dot_justfiles/claude.justfile) specifically the [claude.justfile](https://github.com/garyj/dotfiles/blob/master/home/dot_justfiles/claude.justfile)

If you've been frustrated by plugin management in Claude Code, I hope this saves you some time. The CLI exists, it's just hiding.
