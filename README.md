# agentic-rig

Rig up your project for agentic coding. Analyzes any codebase and generates a complete Claude Code configuration (CLAUDE.md, hooks, skills, subagents, MCP servers).

## Install

```bash
npm i -g agentic-rig
```

Or use without installing:

```bash
npx agentic-rig install
```

## Usage

```
agentic-rig install              # Copy skill files to .claude/skills/
agentic-rig uninstall            # Remove installed skill files
agentic-rig status               # Show installation status
agentic-rig init <template>      # Generate config from a project-type template
agentic-rig discover [query]     # Search for community skills
agentic-rig --version            # Print version
agentic-rig --help               # Print usage
```

### Install options

```
agentic-rig install --force      # Overwrite existing installation without prompting
```

### Init options

```
agentic-rig init --list          # List available templates
agentic-rig init shopify-theme   # Generate config from the shopify-theme template
agentic-rig init shopify-theme --dry-run   # Preview without writing files
agentic-rig init shopify-theme --force     # Overwrite existing files without prompting
agentic-rig init shopify-theme --dir ./my-project  # Target a specific directory
```

### Discover options

```
agentic-rig discover react       # Search for React-related community skills
agentic-rig discover testing     # Search for testing skills
agentic-rig discover shopify     # Search for Shopify skills
```

## What it does

### `/project-setup` skill

`agentic-rig install` copies bundled skills into `.claude/skills/` (project-local). This includes:

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

### `agentic-rig init`

For quick setup without full analysis, `agentic-rig init <template>` generates a complete Claude Code configuration from a curated project-type template. This writes CLAUDE.md, hooks, skills, agents, and MCP server configs in one step.

After generation, `init` displays recommended community skills for the template with install commands.

### `agentic-rig discover`

Search the community skill registry from the command line. Runs `npx skills find <query>` and displays results with install instructions.

```bash
agentic-rig discover react
```

## Available Templates

| Template | Description |
|----------|-------------|
| `shopify-theme` | Shopify theme development with Liquid, Dawn, and Online Store 2.0 |
| `shopify-app` | Shopify app development with React Router, Polaris, Prisma, and extensions |
| `nextjs-sanity` | Next.js with Sanity CMS, App Router, GROQ, and Sanity Studio |
| `python-fastapi` | Python API development with FastAPI, Pydantic, and SQLAlchemy |

Run `agentic-rig init --list` to see all available templates.

## Community Skills

Each template includes curated external skill recommendations from the [skills.sh](https://skills.sh) ecosystem. These are shown after `agentic-rig init` and as E# items during `/project-setup` analysis.

You can also discover skills manually:

```bash
# Via the CLI
agentic-rig discover react

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
