# agentic-rig (v0.6.2)

## Project Overview

CLI tool that analyzes codebases and generates complete Claude Code configurations (CLAUDE.md, hooks, skills, agents, MCP servers). Ships as `agentic-rig` on npm.

The system has three layers:
1. **CLI commands** (`bin/cli.mjs` → `src/commands/`) — `install`, `uninstall`, `status`, `init`, `discover`, `insights`, `generate-template`, `self-improve`
2. **Skill system** (`skills/`) — `project-setup` (codebase analysis + config generation), `find-skills` (community skill search), and `self-improve` (feedback-driven self-improvement)
3. **Feedback loop** (`src/feedback.mjs`, `src/scoring.mjs`) — captures session data, aggregates insights, scores template quality, and drives recursive improvement

Templates are markdown files with YAML frontmatter + structured sections that define everything needed to configure Claude Code for a project type.

## Build & Run Commands

```bash
# Local development — link the CLI globally
npm link

# Run CLI directly during development
node bin/cli.mjs --help

# Install bundled skills to .claude/skills/ (project-local)
agentic-rig install

# Initialize a project from a template
agentic-rig init <template-id>

# List available templates (with quality tiers)
agentic-rig init --list

# Dry run (show what would be generated)
agentic-rig init <template-id> --dry-run

# Search community skills
agentic-rig discover <query>

# Show installation status and template quality
agentic-rig status

# Show heuristic and template quality from feedback data
agentic-rig insights

# Create a template from a successful analysis session
agentic-rig generate-template --from-session <session-id>

# Analyze agentic-rig itself and suggest improvements
agentic-rig self-improve

# Publish to npm
npm publish --access public
```

## Code Style

- **ES Modules only** — all source files use `.mjs` extension with `import`/`export`
- **No TypeScript** — plain JavaScript, no type annotations, no `.d.ts` files
- **Node.js builtins only** — `node:fs/promises`, `node:path`, `node:child_process`, `node:os`, `node:readline`, `node:crypto`
- **Naming** — camelCase for functions and variables, UPPER_SNAKE for constants, kebab-case for file names
- **Functions** — prefer named `export function` declarations over arrow functions for top-level exports
- **Async** — use `async`/`await` throughout, `try`/`catch` for error handling
- **No classes** — functional style with plain objects and module-level functions
- **String quoting** — double quotes for strings, template literals for interpolation
- **Semicolons** — always use semicolons

## Project Structure

```
├── bin/
│   └── cli.mjs                    # CLI entry point — flag parsing, command routing
├── src/
│   ├── analyze.mjs               # Programmatic codebase analysis functions
│   ├── feedback.mjs              # Feedback capture, aggregation, and insights
│   ├── scoring.mjs               # Template quality scoring and tier assignment
│   ├── template-generator.mjs    # Generate templates from feedback sessions
│   ├── templates.mjs             # Template parser (frontmatter, sections, JSON blocks)
│   ├── utils.mjs                 # Shared utilities (file ops, merging, CLI prompts, input sanitization)
│   └── commands/
│       ├── discover.mjs          # Search community skills via npx
│       ├── generate-template.mjs # Create template from feedback session
│       ├── init.mjs              # Generate config from templates (with feedback capture)
│       ├── insights.mjs          # Show heuristic/template quality from feedback
│       ├── install.mjs           # Copy bundled skills to .claude/skills/
│       ├── self-improve.mjs      # Analyze agentic-rig itself (includes security coverage audit)
│       ├── status.mjs            # Show installation status and quality tiers
│       └── uninstall.mjs         # Remove installed skills
├── skills/
│   ├── project-setup/            # Main analysis + generation skill
│   │   ├── SKILL.md              # Skill definition (4-phase workflow with feedback)
│   │   ├── templates/            # Project-type template .md files
│   │   │   ├── _index.md         # Template registry (markdown table)
│   │   │   ├── nextjs-sanity.md
│   │   │   ├── python-fastapi.md
│   │   │   ├── shopify-app.md
│   │   │   └── shopify-theme.md
│   │   └── references/           # Heuristic and output format docs
│   │       ├── agent-workflow-practices.md
│   │       ├── analysis-heuristics.md
│   │       ├── claude-md-template.md
│   │       ├── output-templates.md
│   │       └── windows-considerations.md
│   ├── find-skills/              # Community skill search skill
│   │   └── SKILL.md
│   └── self-improve/             # Feedback-driven self-improvement skill
│       └── SKILL.md
├── package.json
├── README.md
└── LICENSE
```

## Project-Local Data

All data is stored within the project's `.claude/` directory:

```
.claude/
├── skills/                # Installed skill files (via agentic-rig install)
├── agentic-rig/
│   ├── context/           # Session context snapshots (/checkpoint, /recap)
│   │   └── session-YYYY-MM-DD.md
│   ├── feedback/          # Session JSON files (append-only)
│   │   └── {sessionId}.json
│   └── templates/         # User-generated templates
│       ├── _index.md      # User template registry
│       └── {template-id}.md
├── settings.json          # Hooks and permissions
└── .mcp.json              # MCP server configs
```

## Template Anatomy

Templates are `.md` files in `skills/project-setup/templates/` (bundled) or `.claude/agentic-rig/templates/` (user-generated) with this structure:

```
---
id: template-id
name: Display Name
description: Brief description
version: 1
detection:
  files_any:
    - "file-pattern"
  config_files_any:
    - "config-file"
  package_json_deps_any:
    - "dependency"
---

# Template Title

## claude_md
(CLAUDE.md content with ### subsections for Project Overview, Build & Run, Code Style, etc.)

## hooks
```json
{ "PreToolUse": [...], "PostToolUse": [...] }
```

## skills
### skill-name
```markdown
(SKILL.md content with YAML frontmatter)
```

## agents
### agent-name
```markdown
(Agent .md content)
```

## mcp_servers
```json
{ "server-name": { "command": "npx", "args": [...], "type": "stdio" } }
```

## external_skills
| Name | Repository | Skill | Description |
|------|-----------|-------|-------------|
| ... | owner/repo | skill-name | ... |
```

**Parsing rules** (in `src/templates.mjs`):
- Frontmatter: hand-rolled YAML parser supporting scalars, lists, and 2-level nesting
- Sections: `## headings` outside code fences are section delimiters
- Skills/agents: `### subsections` containing ` ```markdown ` code blocks
- Hooks/MCP: first ` ```json ` code block in the section
- External skills: markdown table with columns Name | Repository | Skill | Description
- Detection requires 2+ field groups to match for template auto-selection
- `listTemplates()` and `findTemplate()` search both bundled AND user template directories

## Feedback System

Every config generation (CLI or skill) captures a JSON feedback record:

```json
{
  "sessionId": "uuid",
  "timestamp": "ISO 8601",
  "source": "cli | skill",
  "project": { "type": "...", "frameworks": [...], "size": "small|medium|large" },
  "template": { "id": "...", "confidence": 0.0-1.0 },
  "items": [
    {
      "id": "H1", "category": "hook", "name": "prettier",
      "event": "PostToolUse", "status": "approved|skipped|modified",
      "source": "heuristic|template|discovered", "heuristicKey": "hook:PostToolUse:prettier"
    }
  ],
  "summary": { "total": 10, "approved": 8, "skipped": 1, "modified": 1, "approvalRate": 80 }
}
```

## Template Quality Tiers

Templates are scored based on accumulated feedback:

| Tier | Approval Rate | Min Sessions |
|------|--------------|-------------|
| validated | >= 85% | 5 |
| acceptable | 65-84% | 3 |
| needs-review | < 65% | 3 |
| insufficient-data | any | < 3 |

Quality tiers are shown in `agentic-rig status` and `agentic-rig init --list`.

## Security

### Template Guard Requirements

Every bundled template must include all four PreToolUse guard hooks:

1. **`.env` guard** — blocks edits to `.env*` files (secrets)
2. **Lock file guard** — blocks edits to ecosystem-specific lock files (`package-lock.json`, `yarn.lock`, `poetry.lock`, etc.)
3. **Build artifact guard** — blocks edits to compiled/generated output (`dist/`, `build/`, `*.min.js`, `__pycache__/`, etc.)
4. **Security Notes** — a `### Security Notes` subsection in the template's `claude_md` section with framework-specific security guidance

Migration guards are included where applicable (Prisma, Alembic).

The `self-improve` command and skill both audit templates for these requirements and flag gaps.

### Input Sanitization

`execCommand()` in `src/utils.mjs` runs with `shell: true` (required for Windows `.cmd` shim compatibility). All user-provided arguments passed to `execCommand()` **must** be sanitized with `sanitizeShellArg()` first. This function strips shell metacharacters (`;&|`$(){}[]<>!#\\'"`).

## Dependencies

**Zero external dependencies.** This is a strict project policy. All functionality uses Node.js built-in modules only (`node:fs`, `node:path`, `node:child_process`, `node:os`, `node:readline`, `node:url`, `node:crypto`). Do not add any npm packages. The hand-rolled YAML and markdown parsers exist specifically to avoid library dependencies.

## Testing

No automated test framework is configured. Verification is manual:

1. **Template parsing** — `agentic-rig init --list` confirms templates parse from `_index.md` (both bundled and user)
2. **Config generation** — `agentic-rig init <template> --dry-run` validates output without writing files
3. **Skill installation** — `agentic-rig install` followed by `agentic-rig status` confirms file placement
4. **CLI flags** — `agentic-rig --help` and `agentic-rig --version` for flag handling
5. **Feedback capture** — `agentic-rig init <template>` followed by `agentic-rig insights` confirms feedback recording
6. **Template generation** — `agentic-rig generate-template --from-session <id>` produces valid template parseable by `parseTemplate()`
7. **Self-analysis** — `agentic-rig self-improve` runs without errors against own codebase

When modifying `src/templates.mjs`, test against all four bundled templates to verify parsing still works correctly.

## Releases

- Version is tracked in `package.json` (`"version": "0.6.2"`)
- **Publishing is done via GitHub Actions workflow** — never run `npm publish` manually
- To release: bump version in `package.json`, commit, push, then create a **GitHub Release** (via `gh release create v0.x.x --generate-notes`). The workflow triggers on release publish.
- The `"files"` field limits the published package to `bin/`, `src/`, and `skills/`

---

*Generated by [agentic-rig](https://github.com/srbryers/agentic-rig)*
