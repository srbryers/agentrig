---
name: find-skills
description: Search for community Claude Code skills by topic or framework
invocation: user
user_invocation: /find-skills
---

# Find Skills

Search the community skill registry for Claude Code skills relevant to your project.

## Instructions

When the user invokes `/find-skills` followed by a search query (e.g., `/find-skills react`), search the community skill registry and present installable results.

### Step 1: Get the Search Query

If the user provided a query after `/find-skills`, use it directly. Otherwise, ask what topic, framework, or tool they want to find skills for.

### Step 2: Search the Registry

Run the search command via Bash:

```bash
npx skills find <query>
```

Use a 15-second timeout. If the command fails or `npx` is unavailable, skip to the fallback in Step 4.

### Step 3: Present Results

Display the search results to the user. For each result, include:
- **Name** — the skill name
- **Repository** — the source repository
- **Description** — what the skill does

Then offer to install any skill the user is interested in:

```bash
npx skills add <owner/repo> --skill <skill-name> -y
```

After installation, verify the skill was added by checking for the SKILL.md file in `.claude/skills/`.

### Step 4: Fallback

If `npx skills find` is unavailable or fails:

1. Let the user know the CLI search is unavailable
2. Suggest browsing the registry directly at https://skills.sh
3. Provide the manual install command format: `npx skills add <owner/repo> --skill <skill-name>`

## Examples

- `/find-skills react` — find React-related skills
- `/find-skills testing` — find testing and QA skills
- `/find-skills python` — find Python development skills
- `/find-skills shopify` — find Shopify development skills
