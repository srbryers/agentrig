---
id: shopify-theme
name: Shopify Theme
description: Shopify theme development with Liquid, Dawn, and Online Store 2.0
version: 1
detection:
  files_any:
    - "sections/*.liquid"
    - "layout/theme.liquid"
    - "templates/*.json"
    - "snippets/*.liquid"
  config_files_any:
    - "shopify.theme.toml"
    - ".shopifyignore"
  package_json_deps_any:
    - "@shopify/cli"
    - "@shopify/theme"
---

# Shopify Theme

## claude_md

### Project Overview

This is a Shopify theme project using Online Store 2.0 architecture. Themes use Liquid templating, JSON templates, and section/block patterns.

### Build & Run Commands

```bash
# Start local development server
shopify theme dev --store=YOUR_STORE

# Push theme to store
shopify theme push

# Pull latest theme from store
shopify theme pull

# Check theme for issues
shopify theme check

# Open theme in browser
shopify theme open
```

### Code Style

- **Liquid:** Use `{% liquid %}` tag for multi-line logic instead of individual tags
- **Sections:** Every section must include a `{% schema %}` block at the end
- **CSS:** Use CSS custom properties defined in `settings_schema.json` for theme colors/fonts
- **JavaScript:** Use vanilla JS or minimal libraries; avoid heavy frameworks in theme code
- **Naming:** Use kebab-case for file names, snake_case for Liquid variables and schema settings

### Project Structure

```
├── assets/           # CSS, JS, images (compiled/static)
├── config/           # settings_schema.json, settings_data.json
├── layout/           # theme.liquid, password.liquid
├── locales/          # Translation files (en.default.json, etc.)
├── sections/         # Reusable sections with schema
├── snippets/         # Reusable Liquid partials
├── templates/        # JSON templates (index.json, product.json, etc.)
└── templates/customers/  # Customer account templates
```

### Liquid Conventions

- Use `{{ 'filename.css' | asset_url | stylesheet_tag }}` for CSS includes
- Use `{{ 'filename.js' | asset_url | script_tag }}` for JS includes
- Always provide `| escape` filter for user-generated content
- Use translation keys `{{ 'general.key' | t }}` instead of hardcoded strings
- Section schema `blocks` should include `@app` type for app blocks support
- Use `{% render 'snippet-name' %}` instead of `{% include %}`

### Testing

```bash
# Run theme check (linting)
shopify theme check

# Run theme check with auto-fix
shopify theme check --auto-correct
```

### Security Notes

- Never expose API keys in theme Liquid files
- Use `{{ content | escape }}` for any dynamic content output
- Do not store customer PII in metafields rendered client-side

## hooks

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "shopify theme check --fail-level error --path . --include ChangedFiles 2>/dev/null || true"
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "case \"$CLAUDE_FILE_PATHS\" in *.min.js|*.min.css|assets/*.generated.*) echo 'BLOCKED: Do not edit minified or generated asset files' && exit 2;; esac"
    },
    {
      "matcher": "Write|Edit",
      "command": "case \"$CLAUDE_FILE_PATHS\" in config/settings_data.json) echo 'BLOCKED: settings_data.json is managed by the theme editor — do not edit directly' && exit 2;; esac"
    }
  ]
}
```

## skills

### create-section

```markdown
---
name: create-section
description: Scaffold a new Shopify theme section with schema, blocks, and default settings
invocation: user
user_invocation: /create-section
---

# Create Section

Create a new Shopify Online Store 2.0 section.

## Input

Ask the user for:
1. **Section name** (e.g., "featured-collection", "hero-banner")
2. **Section type** (static or dynamic)
3. **Blocks** — what block types to support (e.g., heading, text, button, image)

## Output

Generate a file at `sections/{name}.liquid` with:

1. HTML/Liquid markup with sensible defaults
2. CSS scoped with `#shopify-section-{{ section.id }}`
3. A complete `{% schema %}` block including:
   - `name` — display name for the theme editor
   - `tag` — semantic HTML tag (section, div, aside)
   - `class` — CSS class for the section wrapper
   - `settings` — section-level settings
   - `blocks` — block types with their own settings
   - `presets` — default preset for the theme editor (dynamic sections only)
   - `@app` block type for app block support

Follow existing section patterns in the project. Match naming conventions and code style from other sections.
```

## agents

### theme-accessibility-reviewer

```markdown
---
name: theme-accessibility-reviewer
description: Reviews Shopify theme code for accessibility compliance
model: sonnet
tools:
  - Read
  - Grep
  - Glob
---

# Theme Accessibility Reviewer

You review Shopify theme Liquid, HTML, CSS, and JavaScript for accessibility issues.

## Review Checklist

1. **Images:** All `<img>` tags must have `alt` attributes. Decorative images use `alt=""` with `role="presentation"`.
2. **Headings:** Heading hierarchy must be sequential (no skipping h1 to h3). Each page should have exactly one h1.
3. **Forms:** All form inputs must have associated `<label>` elements. Use `aria-describedby` for help text.
4. **Color contrast:** Flag hardcoded colors that may have contrast issues. Prefer using theme CSS custom properties.
5. **Focus states:** Interactive elements must have visible focus styles. Check for `outline: none` without replacement.
6. **ARIA:** Verify correct usage of aria-label, aria-hidden, role attributes. Flag redundant ARIA (e.g., `role="button"` on `<button>`).
7. **Keyboard navigation:** Ensure clickable non-button elements have `tabindex="0"` and keyboard event handlers.
8. **Liquid output:** Verify dynamic content uses `| escape` filter and translations use `| t` filter.
9. **Media:** Video/audio elements should have captions or transcripts.
10. **Skip links:** Theme should have a skip-to-content link in the layout.

Output findings as a table: | Severity | File | Line | Issue | Fix |
```

## mcp_servers

```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp@latest"],
    "type": "stdio"
  }
}
```

## external_skills

| Name | Repository | Skill | Description |
|------|-----------|-------|-------------|
| Web Design Guidelines | vercel-labs/agent-skills | web-design-guidelines | Web design best practices and visual guidelines |
| Frontend Design | anthropics/skills | frontend-design | Frontend design patterns and UI implementation |
