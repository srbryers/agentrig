---
name: self-improve
description: Analyze agentic-rig itself using accumulated feedback data to propose improvements to heuristics, templates, and workflows
invocation: user
user_invocation: /self-improve
---

# Self-Improve Skill

You are an agentic-rig improvement specialist. Your job is to analyze agentic-rig's own codebase and accumulated feedback data to propose concrete improvements to its heuristics, templates, and workflows.

## Important Context

This skill operates on agentic-rig itself — the CLI tool that generates Claude Code configurations. You have access to:
- The agentic-rig source code (current working directory should be the agentic-rig repo)
- Feedback data from past analyses stored in `.claude/agentic-rig/feedback/`
- User-generated templates in `.claude/agentic-rig/templates/`

## Execution Workflow

Execute in three phases. Do not skip or combine phases.

---

## Phase 1: Gather Data

### Step 1.1: Load Feedback Data

Read all feedback JSON files from `.claude/agentic-rig/feedback/`:
- Count total sessions
- Calculate overall approval rate
- Identify most/least approved heuristic keys
- Find project types with no matching template

### Step 1.2: Analyze Heuristic Performance

Group feedback items by `heuristicKey` and calculate per-key stats:
- Total occurrences across all sessions
- Approval rate (approved / total)
- Skip rate, modification rate
- Trend: is approval improving or declining across recent sessions?

### Step 1.3: Analyze Template Performance

For each template used:
- Number of sessions
- Average approval rate
- Which items are consistently skipped or modified?
- Which items are always approved?

### Step 1.4: Scan Current Heuristics

Read `.claude/skills/project-setup/references/analysis-heuristics.md`:
- List all signal-to-recommendation mappings
- Cross-reference with feedback data
- Identify heuristics with no feedback data (untested)
- Identify heuristics with poor approval rates

### Step 1.5: Scan Current Templates

Read all template files in `skills/project-setup/templates/`:
- List all bundled templates
- Cross-reference with feedback data per template
- Identify templates with no usage data

### Step 1.6: Review agentic-rig's Own CLAUDE.md

Read `CLAUDE.md` in the agentic-rig repo root:
- Compare against what the analysis heuristics would generate
- Note any outdated information
- Check if new commands/features are documented

---

## Phase 2: Present Improvement Plan

After analysis, present findings and proposed changes:

```
## Self-Improvement Report

### Feedback Summary
- Total sessions: N
- Overall approval rate: N%
- Most approved: [list top 3 heuristic keys]
- Least approved: [list bottom 3 heuristic keys]

### Heuristic Changes

| # | Heuristic Key | Current State | Proposed Change | Rationale |
|---|--------------|--------------|----------------|-----------|
| I1 | hook:PreToolUse:env-guard | Always recommended | Make opt-in | 57% approval |
| I2 | mcp:new-server | Not in heuristics | Add to heuristics | 95% approval when template-sourced |
| ... | ... | ... | ... | ... |

### Template Changes

| # | Template | Issue | Proposed Change |
|---|---------|-------|----------------|
| T1 | python-fastapi | Low approval (68%) | Review hook recommendations |
| T2 | [new] react-native | No template, 4 sessions | Create from high-approval session |
| ... | ... | ... | ... |

### CLAUDE.md Updates

| # | Section | Change |
|---|---------|--------|
| D1 | Build & Run | Add new commands: insights, generate-template, self-improve |
| D2 | Project Structure | Add new files |
| ... | ... | ... |

### Workflow Improvements

| # | Area | Suggestion |
|---|------|-----------|
| W1 | Phase 2 | Add approval rate hint from feedback data |
| W2 | Detection | Improve confidence scoring using feedback |
| ... | ... | ... |
```

Prompt the user:

```
Reply with:
- **approve** — apply all proposed changes
- **skip [IDs]** — approve all except listed items
- **detail [ID]** — show more detail about a specific change
- **cancel** — abort without changes
```

---

## Phase 3: Apply Changes

For each approved change:

### Heuristic Changes (I# items)
- Edit `skills/project-setup/references/analysis-heuristics.md`
- Add, remove, or modify signal-to-recommendation mappings
- Update confidence thresholds based on feedback data

### Template Changes (T# items)
- For template modifications: edit the template `.md` file directly
- For new templates: create in `skills/project-setup/templates/` and update `_index.md`
- For template removals: remove file and index entry (with confirmation)

### CLAUDE.md Updates (D# items)
- Edit `CLAUDE.md` in the agentic-rig repo root
- Merge new sections, update outdated info

### Workflow Improvements (W# items)
- Edit `skills/project-setup/SKILL.md`
- Modify workflow steps as proposed

### Post-Apply Summary

```
## Self-Improvement Complete

### Changes Applied:
- [x] I1: Made env-guard hook opt-in in analysis-heuristics.md
- [x] T2: Created react-native template (4 session average)
- [x] D1: Updated CLAUDE.md with new commands
- [ ] W1: Skipped by user

### Feedback Loop:
These changes will be validated in future sessions.
Run `/self-improve` again after 5+ new sessions to check impact.
```

---

## Constraints

- **Non-destructive**: Never delete feedback data
- **Incremental**: Make small, testable changes rather than wholesale rewrites
- **Evidence-based**: Every change must cite specific feedback data
- **Reversible**: Note what was changed so it can be undone if feedback worsens
- **No external deps**: All changes must maintain the zero-dependency constraint
