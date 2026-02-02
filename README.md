# agent-rig

Rig up your project for agentic coding. Analyzes any codebase and generates a complete Claude Code configuration (CLAUDE.md, hooks, skills, subagents, MCP servers).

## Install

```bash
npm i -g @srbryers/agent-rig
```

Or use without installing:

```bash
npx @srbryers/agent-rig install
```

## Usage

```
agentrig install              # Copy skill files to ~/.claude/skills/
agentrig uninstall            # Remove installed skill files
agentrig status               # Show installation status
agentrig init <template>      # Generate config from a project-type template
agentrig discover [query]     # Search for community skills
agentrig --version            # Print version
agentrig --help               # Print usage
```

### Install options

```
agentrig install --force      # Overwrite existing installation without prompting
```

### Init options

```
agentrig init --list          # List available templates
agentrig init shopify-theme   # Generate config from the shopify-theme template
agentrig init shopify-theme --dry-run   # Preview without writing files
agentrig init shopify-theme --force     # Overwrite existing files without prompting
agentrig init shopify-theme --dir ./my-project  # Target a specific directory
```

### Discover options

```
agentrig discover react       # Search for React-related community skills
agentrig discover testing     # Search for testing skills
agentrig discover shopify     # Search for Shopify skills
```

## What it does

### `/project-setup` skill

`agentrig install` copies bundled skills into `~/.claude/skills/`. This includes:

- **project-setup** — the main analysis and configuration skill
- **find-skills** — a meta-skill for searching community skills

Once installed, use `/project-setup` inside Claude Code to analyze your codebase and generate tailored configuration.

The skill analyzes your project in three phases:

1. **Analyze** -- detects languages, frameworks, formatters, test tools, and discovers community skills
2. **Present plan** -- shows a structured recommendation report for your approval, including external skill recommendations (E# items)
3. **Generate** -- writes CLAUDE.md, hooks, skills, agents, MCP server configs, and installs approved community skills

When a project matches a known template (e.g., Shopify theme, FastAPI app), the skill automatically incorporates domain-specific recommendations marked with `[T]` prefixes in the report.

### `/find-skills` skill

Use `/find-skills <query>` inside Claude Code to search the community skill registry at [skills.sh](https://skills.sh). Results include install commands so you can add skills directly.

### `agentrig init`

For quick setup without full analysis, `agentrig init <template>` generates a complete Claude Code configuration from a curated project-type template. This writes CLAUDE.md, hooks, skills, agents, and MCP server configs in one step.

After generation, `init` displays recommended community skills for the template with install commands.

### `agentrig discover`

Search the community skill registry from the command line. Runs `npx skills find <query>` and displays results with install instructions.

```bash
agentrig discover react
```

## Available Templates

| Template | Description |
|----------|-------------|
| `shopify-theme` | Shopify theme development with Liquid, Dawn, and Online Store 2.0 |
| `shopify-app` | Shopify app development with React Router, Polaris, Prisma, and extensions |
| `nextjs-sanity` | Next.js with Sanity CMS, App Router, GROQ, and Sanity Studio |
| `python-fastapi` | Python API development with FastAPI, Pydantic, and SQLAlchemy |

Run `agentrig init --list` to see all available templates.

## Community Skills

Each template includes curated external skill recommendations from the [skills.sh](https://skills.sh) ecosystem. These are shown after `agentrig init` and as E# items during `/project-setup` analysis.

You can also discover skills manually:

```bash
# Via the CLI
agentrig discover react

# Via npx directly
npx skills find react

# Install a skill
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices
```

Browse all available skills at [skills.sh](https://skills.sh).

## Requirements

- Node.js >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## License

MIT
