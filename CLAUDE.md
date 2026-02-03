# agent-rig (v0.4.0)

## Project Overview

CLI tool that analyzes codebases and generates complete Claude Code configurations (CLAUDE.md, hooks, skills, agents, MCP servers). Ships as `@srbryers/agent-rig` on npm.

The system has three layers:
1. **CLI commands** (`bin/agentrig.mjs` → `src/commands/`) — `install`, `uninstall`, `status`, `init`, `discover`, `insights`, `generate-template`, `self-improve`
2. **Skill system** (`skills/`) — `project-setup` (codebase analysis + config generation), `find-skills` (community skill search), and `self-improve` (feedback-driven self-improvement)
3. **Feedback loop** (`src/feedback.mjs`, `src/scoring.mjs`) — captures session data, aggregates insights, scores template quality, and drives recursive improvement

Templates are markdown files with YAML frontmatter + structured sections that define everything needed to configure Claude Code for a project type.

## Build & Run Commands

```bash
# Local development — link the CLI globally
npm link

# Run CLI directly during development
node bin/agentrig.mjs --help

# Install bundled skills to ~/.claude/skills/
agentrig install

# Initialize a project from a template
agentrig init <template-id>

# List available templates (with quality tiers)
agentrig init --list

# Dry run (show what would be generated)
agentrig init <template-id> --dry-run

# Search community skills
agentrig discover <query>

# Show installation status and template quality
agentrig status

# Show heuristic and template quality from feedback data
agentrig insights

# Create a template from a successful analysis session
agentrig generate-template --from-session <session-id>

# Analyze agent-rig itself and suggest improvements
agentrig self-improve

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
│   └── agentrig.mjs              # CLI entry point — flag parsing, command routing
├── src/
│   ├── analyze.mjs               # Programmatic codebase analysis functions
│   ├── feedback.mjs              # Feedback capture, aggregation, and insights
│   ├── scoring.mjs               # Template quality scoring and tier assignment
│   ├── template-generator.mjs    # Generate templates from feedback sessions
│   ├── templates.mjs             # Template parser (frontmatter, sections, JSON blocks)
│   ├── utils.mjs                 # Shared utilities (file ops, merging, CLI prompts)
│   └── commands/
│       ├── discover.mjs          # Search community skills via npx
│       ├── generate-template.mjs # Create template from feedback session
│       ├── init.mjs              # Generate config from templates (with feedback capture)
│       ├── insights.mjs          # Show heuristic/template quality from feedback
│       ├── install.mjs           # Copy bundled skills to ~/.claude/skills/
│       ├── self-improve.mjs      # Analyze agent-rig itself
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

## User Data Directory

Feedback and user-generated templates are stored outside the project:

```
~/.claude/agent-rig/
├── feedback/              # Session JSON files (append-only)
│   └── {sessionId}.json   # One file per analysis session
└── templates/             # User-generated templates
    ├── _index.md          # User template registry
    └── {template-id}.md   # Generated template files
```

## Template Anatomy

Templates are `.md` files in `skills/project-setup/templates/` (bundled) or `~/.claude/agent-rig/templates/` (user-generated) with this structure:

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

Quality tiers are shown in `agentrig status` and `agentrig init --list`.

## Dependencies

**Zero external dependencies.** This is a strict project policy. All functionality uses Node.js built-in modules only (`node:fs`, `node:path`, `node:child_process`, `node:os`, `node:readline`, `node:url`, `node:crypto`). Do not add any npm packages. The hand-rolled YAML and markdown parsers exist specifically to avoid library dependencies.

## Testing

No automated test framework is configured. Verification is manual:

1. **Template parsing** — `agentrig init --list` confirms templates parse from `_index.md` (both bundled and user)
2. **Config generation** — `agentrig init <template> --dry-run` validates output without writing files
3. **Skill installation** — `agentrig install` followed by `agentrig status` confirms file placement
4. **CLI flags** — `agentrig --help` and `agentrig --version` for flag handling
5. **Feedback capture** — `agentrig init <template>` followed by `agentrig insights` confirms feedback recording
6. **Template generation** — `agentrig generate-template --from-session <id>` produces valid template parseable by `parseTemplate()`
7. **Self-analysis** — `agentrig self-improve` runs without errors against own codebase

When modifying `src/templates.mjs`, test against all four bundled templates to verify parsing still works correctly.

## Releases

- Version is tracked in `package.json` (`"version": "0.4.0"`)
- **Publishing is done via GitHub Actions workflow** — never run `npm publish` manually
- To release: bump version in `package.json`, commit, push, and create a git tag (`git tag v0.x.x && git push origin v0.x.x`). The workflow handles the rest.
- The `"files"` field limits the published package to `bin/`, `src/`, and `skills/`

---

*Generated by [agent-rig](https://github.com/srbryers/agent-rig)*
