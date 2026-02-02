---
id: shopify-app
name: Shopify App
description: Shopify app development with React Router, Polaris, Prisma, and extensions
version: 1
detection:
  files_any:
    - "shopify.app.toml"
    - "extensions/*/shopify.extension.toml"
  config_files_any:
    - "shopify.app.toml"
    - "extensions/"
  package_json_deps_any:
    - "@shopify/polaris"
    - "@shopify/shopify-app-remix"
    - "@shopify/shopify-app-react-router"
    - "@shopify/app-bridge-react"
---

# Shopify App

## claude_md

### Project Overview

This is a Shopify app built with React Router (or Remix), Polaris UI components, and the Shopify App framework. It uses Prisma for database access and supports Shopify extensions (theme, checkout, admin UI).

### Build & Run Commands

```bash
# Start local development
shopify app dev

# Deploy app and extensions
shopify app deploy

# Generate a new extension
shopify app generate extension

# Open app in admin
shopify app open

# View app logs
shopify app logs

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Run tests
npm test
```

### Code Style

- **Components:** Use Polaris components from `@shopify/polaris` for all UI — do not create custom components for patterns Polaris already provides
- **Routing:** Use React Router file-based routing in `app/routes/`
- **Data loading:** Use `loader` functions for server-side data fetching and `action` functions for mutations
- **Authentication:** Auth is handled by the Shopify app framework — do not implement custom auth. Use `authenticate.admin(request)` in loaders/actions
- **API calls:** Use the `admin` GraphQL client from the authenticated context, not raw fetch calls
- **Naming:** Use PascalCase for components, camelCase for utilities, kebab-case for route files

### Project Structure

```
├── app/
│   ├── routes/          # React Router routes (file-based routing)
│   ├── components/      # App-specific components
│   ├── models/          # Prisma model helpers
│   ├── utils/           # Shared utilities
│   └── shopify.server.js  # Shopify app configuration
├── extensions/          # Shopify extensions
│   ├── theme-ext/       # Theme app extensions
│   ├── checkout-ext/    # Checkout UI extensions
│   └── admin-ext/       # Admin UI extensions
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
└── public/              # Static assets
```

### Shopify API Conventions

- Use GraphQL Admin API via `admin.graphql()` — avoid REST API where possible
- Always handle GraphQL `userErrors` in responses
- Use bulk operations for processing large datasets
- Paginate with cursor-based pagination using `pageInfo { hasNextPage, endCursor }`
- Webhooks are registered in `shopify.app.toml` and handled in route action functions

### Webhook Handling

- Register webhooks in `shopify.app.toml` under `[webhooks]`
- Handle webhook payloads in `app/routes/webhooks.jsx` (or similar)
- Always verify webhook HMAC — the framework handles this automatically via `authenticate.webhook(request)`
- Process webhooks idempotently — they may be delivered more than once

### Extension Development

- Theme extensions: Liquid + CSS + JS in `extensions/theme-ext/`
- Checkout extensions: React components using `@shopify/checkout-ui-extensions-react`
- Admin extensions: React components using `@shopify/admin-ui-extensions-react`
- Each extension has its own `shopify.extension.toml` configuration

### Security Notes

- Never expose Shopify API secret or app credentials in client-side code
- Use session tokens for authenticated API calls — do not store tokens in localStorage
- Validate all webhook signatures before processing
- Sanitize user input before storing or rendering

### Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

## hooks

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "npx prisma format 2>/dev/null || true"
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "case \"$CLAUDE_FILE_PATHS\" in prisma/migrations/*) echo 'BLOCKED: Do not edit migration files directly — use prisma migrate dev' && exit 2;; esac"
    },
    {
      "matcher": "Write|Edit",
      "command": "case \"$CLAUDE_FILE_PATHS\" in *.env*) echo 'BLOCKED: Do not edit .env files — they may contain API secrets' && exit 2;; esac"
    }
  ]
}
```

## skills

### create-extension

```markdown
---
name: create-extension
description: Scaffold a new Shopify app extension (theme, checkout, or admin UI)
invocation: user
user_invocation: /create-extension
---

# Create Extension

Create a new Shopify app extension.

## Input

Ask the user for:
1. **Extension type** — theme, checkout UI, admin UI, or function
2. **Extension name** (e.g., "product-reviews", "order-status")
3. **Purpose** — what the extension does

## Output

1. Create the extension directory under `extensions/{name}/`
2. Generate `shopify.extension.toml` with appropriate configuration
3. Generate the main source file(s) based on extension type:
   - **Theme:** `blocks/{name}.liquid` with schema
   - **Checkout UI:** `src/Checkout.jsx` with checkout components
   - **Admin UI:** `src/ActionExtension.jsx` with admin components
   - **Function:** `src/run.js` (or `.rs`) with function logic
4. Follow existing extension patterns in the project

After generating, remind the user to run `shopify app deploy` to register the extension.
```

### add-webhook

```markdown
---
name: add-webhook
description: Add a new webhook handler to the Shopify app
invocation: user
user_invocation: /add-webhook
---

# Add Webhook

Register and handle a new Shopify webhook.

## Input

Ask the user for:
1. **Webhook topic** (e.g., `ORDERS_CREATE`, `PRODUCTS_UPDATE`, `APP_UNINSTALLED`)
2. **What to do** when the webhook fires

## Output

1. Add the webhook topic to `shopify.app.toml` under `[webhooks]` if not already present
2. Add or update the webhook handler in the webhooks route file
3. Implement the processing logic, ensuring:
   - Idempotent processing (check if already handled)
   - Error handling with appropriate logging
   - Database updates via Prisma if needed

Follow the existing webhook handling pattern in the project.
```

## agents

### polaris-reviewer

```markdown
---
name: polaris-reviewer
description: Reviews Shopify app UI code for Polaris design system compliance
model: sonnet
tools:
  - Read
  - Grep
  - Glob
---

# Polaris Reviewer

You review Shopify app React components for compliance with the Polaris design system and Shopify app best practices.

## Review Checklist

1. **Use Polaris components:** Flag custom HTML elements when a Polaris equivalent exists (e.g., custom button instead of `<Button>`, custom card instead of `<Card>`).
2. **Layout patterns:** Verify correct use of `<Page>`, `<Layout>`, `<Card>` hierarchy. Pages should use `<Page>` with `title` and `backAction` props.
3. **Forms:** Forms should use `<Form>` with `<FormLayout>`. Inputs should use Polaris form components (`<TextField>`, `<Select>`, etc.).
4. **Loading states:** Data-dependent UI should handle loading states with `<SkeletonPage>`, `<SkeletonBodyText>`, or `<Spinner>`.
5. **Error handling:** Actions should show `<Banner>` for errors. Destructive actions need confirmation via `<Modal>`.
6. **Responsive:** Avoid fixed widths. Use Polaris layout components which handle responsive behavior.
7. **App Bridge:** Navigation should use App Bridge-compatible patterns. Links to Shopify admin should use App Bridge `NavigationMenu`.
8. **Authentication:** Verify loaders use `authenticate.admin(request)` and not custom auth logic.
9. **GraphQL:** Check that GraphQL queries handle `userErrors` and use proper pagination.
10. **Accessibility:** Polaris components have built-in a11y — flag custom components that bypass this.

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
| React Best Practices | vercel-labs/agent-skills | vercel-react-best-practices | React patterns and best practices from Vercel |
| Web Design Guidelines | vercel-labs/agent-skills | web-design-guidelines | Web design best practices and visual guidelines |
