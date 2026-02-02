---
id: nextjs-sanity
name: Next.js + Sanity
description: Next.js with Sanity CMS, App Router, GROQ queries, and Sanity Studio
version: 1
detection:
  files_any:
    - "sanity.config.ts"
    - "sanity.config.js"
    - "sanity.config.mts"
    - "sanity.cli.ts"
    - "sanity.cli.js"
  config_files_any:
    - "next.config.js"
    - "next.config.mjs"
    - "next.config.ts"
  package_json_deps_any:
    - "next-sanity"
    - "@sanity/client"
    - "@sanity/image-url"
    - "sanity"
---

# Next.js + Sanity

## claude_md

### Project Overview

This is a Next.js project with Sanity CMS as the content backend. It uses the App Router, GROQ queries for content fetching, and includes an embedded or standalone Sanity Studio for content management.

### Build & Run Commands

```bash
# Start Next.js dev server
npm run dev

# Start Sanity Studio (if standalone)
npx sanity dev

# Build for production
npm run build

# Start production server
npm start

# Deploy Sanity schema changes
npx sanity deploy

# Run Sanity dataset export
npx sanity dataset export production

# Generate TypeScript types from Sanity schema
npx sanity typegen generate
```

### Code Style

- **Components:** Use React Server Components by default. Add `"use client"` only when client interactivity is needed
- **Data fetching:** Use GROQ queries with `sanityFetch()` in Server Components. Do not use `useEffect` for data loading
- **Images:** Use `@sanity/image-url` or `next-sanity-image` for Sanity image URLs. Always use `<Image>` from `next/image` for rendering
- **Routing:** Use Next.js App Router conventions — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **Naming:** PascalCase for components, camelCase for utilities, kebab-case for route segments

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── (site)/             # Public-facing routes
│   │   ├── page.tsx        # Homepage
│   │   ├── [slug]/         # Dynamic routes
│   │   └── layout.tsx      # Site layout
│   ├── studio/[[...tool]]/ # Embedded Sanity Studio (if using)
│   ├── api/                # API routes
│   │   ├── draft/          # Draft mode endpoints
│   │   └── revalidate/     # On-demand ISR webhook
│   └── layout.tsx          # Root layout
├── sanity/
│   ├── schemas/            # Sanity document and object type schemas
│   ├── lib/                # Sanity client, queries, fetch helpers
│   └── plugins/            # Sanity Studio plugins
├── components/             # React components
│   ├── ui/                 # Generic UI components
│   └── blocks/             # Content block renderers
└── public/                 # Static assets
```

### GROQ Query Conventions

- Define queries in `sanity/lib/queries.ts` as named exports
- Use GROQ projections to fetch only needed fields — avoid `*[_type == "page"][0]{ ... }` without projections
- Always include `_id`, `_type` for document references
- Use `coalesce()` for optional fields with fallbacks
- For images, project `asset->{ url, metadata { dimensions } }` for responsive rendering
- Use `defined()` checks for optional referenced documents

```groq
// Example query pattern
*[_type == "page" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  body[]{
    ...,
    _type == "image" => {
      ...,
      asset->{ url, metadata { dimensions } }
    }
  }
}
```

### Sanity Schema Conventions

- Define each schema type in its own file under `sanity/schemas/`
- Use `defineType`, `defineField`, `defineArrayMember` from `sanity`
- Group related schemas with schema groups
- Add `validation` rules for required fields
- Use `preview` configuration for meaningful Studio list items
- Use `fieldsets` to organize complex document types

### Caching and Revalidation

- Use ISR with `revalidate` export in route segments or `next.revalidate` in fetch options
- Set up on-demand revalidation via webhook from Sanity: `app/api/revalidate/route.ts`
- Use `draftMode()` for preview functionality
- Tag-based revalidation: use `revalidateTag('sanity')` for Sanity content updates

### Security Notes

- Keep Sanity token server-side only — never expose in client components
- Validate webhook signatures in revalidation endpoints
- Use read-only token for public data fetching, write token only in API routes
- Draft mode should require authentication

### Testing

```bash
# Run tests
npm test

# Run type checking
npx tsc --noEmit
```

## hooks

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "npx tsc --noEmit --pretty 2>&1 | head -20 || true"
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "case \"$CLAUDE_FILE_PATHS\" in *.env*) echo 'BLOCKED: Do not edit .env files — they contain Sanity tokens and API keys' && exit 2;; esac"
    }
  ]
}
```

## skills

### create-schema

```markdown
---
name: create-schema
description: Scaffold a new Sanity schema type with fields, validation, and preview
invocation: user
user_invocation: /create-schema
---

# Create Schema

Create a new Sanity document or object type schema.

## Input

Ask the user for:
1. **Schema name** (e.g., "blogPost", "teamMember", "hero")
2. **Schema kind** — document or object
3. **Fields** — list of fields with types (string, text, image, reference, array, etc.)

## Output

Generate a file at `sanity/schemas/{name}.ts` with:

1. Schema definition using `defineType` and `defineField`
2. Appropriate field types and validation rules
3. Preview configuration for the Studio list view
4. Fieldsets for logical grouping if 5+ fields

Then update the schema index file to include the new type.

Follow existing schema patterns in `sanity/schemas/`.
```

### create-page

```markdown
---
name: create-page
description: Scaffold a new Next.js page with Sanity data fetching and GROQ query
invocation: user
user_invocation: /create-page
---

# Create Page

Create a new Next.js App Router page with Sanity CMS data fetching.

## Input

Ask the user for:
1. **Route path** (e.g., "/blog", "/about", "/blog/[slug]")
2. **Sanity content type** to fetch
3. **Page type** — static, dynamic, or dynamic with ISR

## Output

Generate files in the appropriate `app/` directory:

1. `page.tsx` — Server Component with GROQ query and data fetching
2. `loading.tsx` — Loading skeleton component
3. Add GROQ query to `sanity/lib/queries.ts`
4. If dynamic route with ISR, include `generateStaticParams` and `revalidate` export

Follow existing page patterns in the project. Use `sanityFetch()` helper for data fetching.
```

## agents

### groq-reviewer

```markdown
---
name: groq-reviewer
description: Reviews GROQ queries for performance, correctness, and best practices
model: haiku
tools:
  - Read
  - Grep
  - Glob
---

# GROQ Reviewer

You review GROQ queries used in Next.js + Sanity projects for correctness, performance, and best practices.

## Review Checklist

1. **Projections:** Flag queries without projections that fetch all fields (`*[_type == "post"]` without `{ ... }`).
2. **Unused fields:** Identify projected fields that aren't used in the consuming component.
3. **References:** Verify referenced documents are dereferenced with `->` when their fields are needed.
4. **Image handling:** Check that image queries include `asset->{ url, metadata }` for proper rendering.
5. **Filtering:** Ensure filters use indexed fields (`_type`, `slug.current`) for performance.
6. **Ordering:** Verify `order()` is used on indexed fields. Flag sorting on computed or nested fields.
7. **Pagination:** For list queries, check that `[$start...$end]` or cursor pagination is used.
8. **Null safety:** Flag direct property access on optional references without `defined()` checks.
9. **Type safety:** Verify query results match TypeScript types. Flag mismatches.
10. **Caching:** Check that queries used in static pages have appropriate revalidation settings.

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
| Next.js Best Practices | vercel-labs/next-skills | next-best-practices | Next.js patterns, App Router, and performance |
| React Best Practices | vercel-labs/agent-skills | vercel-react-best-practices | React patterns and best practices from Vercel |
| Web Design Guidelines | vercel-labs/agent-skills | web-design-guidelines | Web design best practices and visual guidelines |
