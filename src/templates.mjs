import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Returns the path to the bundled templates directory.
 */
export function getTemplatesDir() {
  return join(__dirname, "..", "skills", "project-setup", "templates");
}

/**
 * List available templates by reading _index.md from the templates directory.
 * Returns [{id, name, description, file}]
 */
export async function listTemplates(templatesDir) {
  const dir = templatesDir || getTemplatesDir();
  const indexPath = join(dir, "_index.md");
  let content;
  try {
    content = await readFile(indexPath, "utf8");
  } catch {
    return [];
  }
  return parseIndex(content);
}

/**
 * Parse _index.md content into a list of template entries.
 * Format: markdown table with columns: ID | Name | Description | File
 */
function parseIndex(content) {
  const lines = content.split("\n");
  const templates = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length < 4) continue;

    // Skip header row
    if (cells[0].toLowerCase() === "id") {
      inTable = true;
      continue;
    }

    // Skip separator row
    if (cells[0].startsWith("-")) {
      continue;
    }

    if (inTable) {
      templates.push({
        id: cells[0],
        name: cells[1],
        description: cells[2],
        file: cells[3],
      });
    }
  }

  return templates;
}

/**
 * Parse a template .md file into structured data.
 * Returns:
 * {
 *   meta: { id, name, description, version, detection },
 *   claude_md: "string",
 *   hooks: { PreToolUse: [...], PostToolUse: [...] },
 *   skills: { "name": "content", ... },
 *   agents: { "name": "content", ... },
 *   mcp_servers: { "name": {...}, ... }
 * }
 */
export async function parseTemplate(filePath) {
  const content = await readFile(filePath, "utf8");
  return parseTemplateContent(content);
}

/**
 * Parse template content string (exported for testing).
 */
export function parseTemplateContent(content) {
  const { frontmatter, body } = extractFrontmatter(content);
  const meta = parseFrontmatter(frontmatter);
  const sections = extractSections(body);

  return {
    meta,
    claude_md: sections.claude_md || "",
    hooks: sections.hooks || {},
    skills: sections.skills || {},
    agents: sections.agents || {},
    mcp_servers: sections.mcp_servers || {},
    external_skills: sections.external_skills || [],
  };
}

/**
 * Split content into YAML frontmatter and body.
 */
function extractFrontmatter(content) {
  const lines = content.split("\n");

  if (lines[0].trim() !== "---") {
    return { frontmatter: "", body: content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: "", body: content };
  }

  return {
    frontmatter: lines.slice(1, endIndex).join("\n"),
    body: lines.slice(endIndex + 1).join("\n"),
  };
}

/**
 * Hand-rolled shallow YAML parser for frontmatter.
 * Supports: scalars, simple lists (- item), and nested objects two levels deep.
 *
 * Tracks state with: parentKey (top-level block), childKey (nested block under parent),
 * and the indent levels at which each was opened.
 */
function parseFrontmatter(yaml) {
  if (!yaml.trim()) return {};

  const result = {};
  const lines = yaml.split("\n");

  // State: which top-level key and (optionally) which child key we are inside
  let parentKey = null; // e.g., "detection"
  let parentIndent = -1;
  let childKey = null; // e.g., "files_any" (always under parentKey)
  let childIndent = -1;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // --- Top-level (indent 0) ---
    if (indent === 0 && trimmed.includes(":")) {
      parentKey = null;
      childKey = null;
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (value && value !== "[]") {
        result[key] = parseScalar(value);
      } else if (value === "[]") {
        result[key] = [];
      } else {
        result[key] = {};
        parentKey = key;
        parentIndent = indent;
      }
      continue;
    }

    // --- Indented content under a parent key ---
    if (parentKey && indent > parentIndent) {

      // If we are inside a child key's list, check if this line is still at child-list depth
      if (childKey && indent > childIndent && trimmed.startsWith("- ")) {
        const item = trimmed.slice(2).trim().replace(/^["']|["']$/g, "");
        result[parentKey][childKey].push(item);
        continue;
      }

      // If indent dropped back to parent's child level (or we see a new key at that level),
      // reset childKey so we can pick up a sibling
      if (childKey && indent <= childIndent) {
        childKey = null;
      }

      // List item directly under parent (parent is a list, not an object)
      if (trimmed.startsWith("- ")) {
        const item = trimmed.slice(2).trim().replace(/^["']|["']$/g, "");
        if (!Array.isArray(result[parentKey])) {
          result[parentKey] = [];
        }
        result[parentKey].push(item);
        continue;
      }

      // Nested key: value (child of parent)
      if (trimmed.includes(":")) {
        if (typeof result[parentKey] !== "object" || Array.isArray(result[parentKey])) {
          result[parentKey] = {};
        }
        const colonIdx = trimmed.indexOf(":");
        const nestedKey = trimmed.slice(0, colonIdx).trim();
        const nestedValue = trimmed.slice(colonIdx + 1).trim();

        if (nestedValue && nestedValue !== "[]") {
          result[parentKey][nestedKey] = parseScalar(nestedValue);
          childKey = null;
        } else {
          // Empty value or [] — this child holds a list
          result[parentKey][nestedKey] = [];
          childKey = nestedKey;
          childIndent = indent;
        }
        continue;
      }
    }
  }

  return result;
}

/**
 * Parse a scalar YAML value: strip quotes, convert numbers.
 */
function parseScalar(value) {
  const stripped = value.replace(/^["']|["']$/g, "");
  if (/^\d+$/.test(stripped)) return parseInt(stripped, 10);
  return stripped;
}

/**
 * Find top-level ## headings, ignoring any inside fenced code blocks.
 * Returns [{name, index, fullMatch}] with positions relative to body.
 */
function findTopLevelSections(body) {
  const lines = body.split("\n");
  const sections = [];
  let inFence = false;
  let pos = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track fenced code block boundaries
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
    }

    // Only match ## headings outside of code blocks
    if (!inFence && /^## .+/.test(trimmed)) {
      sections.push({
        name: trimmed.slice(3).trim().toLowerCase(),
        index: pos,
        fullMatch: line,
      });
    }

    pos += line.length + 1; // +1 for the \n
  }

  return sections;
}

/**
 * Extract sections from the body (after frontmatter).
 * Sections are delimited by ## headings (outside code blocks).
 * Subsections (### headings) are used for named entries within skills/agents.
 */
function extractSections(body) {
  const result = {
    claude_md: "",
    hooks: {},
    skills: {},
    agents: {},
    mcp_servers: {},
    external_skills: [],
  };

  const sectionStarts = findTopLevelSections(body);

  if (sectionStarts.length === 0) {
    return result;
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const section = sectionStarts[i];
    const contentStart = section.index + section.fullMatch.length;
    const contentEnd =
      i + 1 < sectionStarts.length ? sectionStarts[i + 1].index : body.length;
    const content = body.slice(contentStart, contentEnd).trim();

    switch (section.name) {
      case "claude_md":
        result.claude_md = content;
        break;

      case "hooks":
        result.hooks = extractJsonBlock(content) || {};
        break;

      case "skills":
        result.skills = extractNamedSubsections(content);
        break;

      case "agents":
        result.agents = extractNamedSubsections(content);
        break;

      case "mcp_servers":
        result.mcp_servers = extractJsonBlock(content) || {};
        break;

      case "external_skills":
        result.external_skills = parseExternalSkillsTable(content);
        break;
    }
  }

  return result;
}

/**
 * Extract the first JSON code block from content.
 */
function extractJsonBlock(content) {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Find top-level ### headings in content, ignoring any inside fenced code blocks.
 */
function findTopLevelSubsections(content) {
  const lines = content.split("\n");
  const subs = [];
  let inFence = false;
  let pos = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inFence = !inFence;
    }

    if (!inFence && /^### .+/.test(trimmed)) {
      subs.push({
        name: trimmed.slice(4).trim(),
        index: pos,
        fullMatch: line,
      });
    }

    pos += line.length + 1;
  }

  return subs;
}

/**
 * Extract ### subsections as named entries.
 * Returns { "name": "content", ... }
 * Content is extracted from markdown code blocks within each subsection.
 */
function extractNamedSubsections(content) {
  const result = {};
  const subStarts = findTopLevelSubsections(content);

  for (let i = 0; i < subStarts.length; i++) {
    const sub = subStarts[i];
    const subContentStart = sub.index + sub.fullMatch.length;
    const subContentEnd =
      i + 1 < subStarts.length ? subStarts[i + 1].index : content.length;
    const subContent = content.slice(subContentStart, subContentEnd).trim();

    // Extract content from markdown code block
    const mdBlock = subContent.match(/```markdown\s*\n([\s\S]*?)\n```/);
    if (mdBlock) {
      result[sub.name] = mdBlock[1].trim();
    } else {
      // Use the raw content if no code block
      result[sub.name] = subContent;
    }
  }

  return result;
}

/**
 * Parse a markdown table of external skills into structured data.
 * Format: | Name | Repository | Skill | Description |
 * Returns [{name, repository, skill, description}]
 */
function parseExternalSkillsTable(content) {
  const lines = content.split("\n");
  const skills = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length < 4) continue;

    // Skip header row
    if (cells[0].toLowerCase() === "name") {
      inTable = true;
      continue;
    }

    // Skip separator row
    if (cells[0].startsWith("-")) {
      continue;
    }

    if (inTable) {
      skills.push({
        name: cells[0],
        repository: cells[1],
        skill: cells[2],
        description: cells[3],
      });
    }
  }

  return skills;
}

/**
 * Find a template by ID from available templates.
 * Searches the given directory (or bundled templates).
 */
export async function findTemplate(templateId, templatesDir) {
  const dir = templatesDir || getTemplatesDir();
  const templates = await listTemplates(dir);
  const entry = templates.find((t) => t.id === templateId);
  if (!entry) return null;
  return parseTemplate(join(dir, entry.file));
}
