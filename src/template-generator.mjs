import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileIfExists, writeFileWithDir } from "./utils.mjs";
import { getUserTemplatesDir } from "./templates.mjs";

/**
 * Build a template ID from a project type string.
 * Converts to kebab-case and strips special characters.
 */
export function buildTemplateId(projectType) {
  return projectType
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "custom";
}

/**
 * Build template frontmatter YAML from metadata.
 */
export function buildFrontmatter(meta) {
  const lines = [
    "---",
    `id: ${meta.id}`,
    `name: ${meta.name}`,
    `description: ${meta.description}`,
    `version: 1`,
  ];

  if (meta.detection) {
    lines.push("detection:");
    for (const [key, values] of Object.entries(meta.detection)) {
      if (Array.isArray(values) && values.length > 0) {
        lines.push(`  ${key}:`);
        for (const v of values) {
          lines.push(`    - "${v}"`);
        }
      }
    }
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Build a complete template markdown file from feedback data and content.
 *
 * @param {object} options
 * @param {object} options.meta - Template metadata { id, name, description, detection }
 * @param {string} [options.claudeMd] - CLAUDE.md content
 * @param {object} [options.hooks] - Hooks object { PreToolUse: [...], PostToolUse: [...] }
 * @param {object} [options.skills] - Skills { name: content }
 * @param {object} [options.agents] - Agents { name: content }
 * @param {object} [options.mcpServers] - MCP servers { name: config }
 * @param {Array} [options.externalSkills] - External skills [{ name, repository, skill, description }]
 * @returns {string} Complete template markdown
 */
export function buildTemplateContent(options) {
  const {
    meta,
    claudeMd,
    hooks,
    skills,
    agents,
    mcpServers,
    externalSkills,
  } = options;

  const parts = [buildFrontmatter(meta), ""];
  parts.push(`# ${meta.name}`);
  parts.push("");

  // claude_md section
  if (claudeMd) {
    parts.push("## claude_md");
    parts.push(claudeMd.trim());
    parts.push("");
  }

  // hooks section
  if (hooks && Object.keys(hooks).length > 0) {
    parts.push("## hooks");
    parts.push("```json");
    parts.push(JSON.stringify(hooks, null, 2));
    parts.push("```");
    parts.push("");
  }

  // skills section
  if (skills && Object.keys(skills).length > 0) {
    parts.push("## skills");
    for (const [name, content] of Object.entries(skills)) {
      parts.push(`### ${name}`);
      parts.push("```markdown");
      parts.push(content.trim());
      parts.push("```");
      parts.push("");
    }
  }

  // agents section
  if (agents && Object.keys(agents).length > 0) {
    parts.push("## agents");
    for (const [name, content] of Object.entries(agents)) {
      parts.push(`### ${name}`);
      parts.push("```markdown");
      parts.push(content.trim());
      parts.push("```");
      parts.push("");
    }
  }

  // mcp_servers section
  if (mcpServers && Object.keys(mcpServers).length > 0) {
    parts.push("## mcp_servers");
    parts.push("```json");
    parts.push(JSON.stringify(mcpServers, null, 2));
    parts.push("```");
    parts.push("");
  }

  // external_skills section
  if (externalSkills && externalSkills.length > 0) {
    parts.push("## external_skills");
    parts.push("| Name | Repository | Skill | Description |");
    parts.push("|------|-----------|-------|-------------|");
    for (const s of externalSkills) {
      parts.push(`| ${s.name} | ${s.repository} | ${s.skill} | ${s.description} |`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Build detection rules from a feedback record's project metadata.
 */
export function buildDetectionRules(record) {
  const detection = {};
  const frameworks = record.project?.frameworks || [];

  // Derive detection hints from project type and frameworks
  if (frameworks.length > 0) {
    detection.package_json_deps_any = frameworks.slice(0, 5);
  }

  return detection;
}

/**
 * Save a generated template to the user templates directory.
 * Also updates _index.md.
 */
export async function saveUserTemplate(templateId, content, meta, projectRoot) {
  const userTemplatesDir = getUserTemplatesDir(projectRoot);
  await mkdir(userTemplatesDir, { recursive: true });

  const filePath = join(userTemplatesDir, `${templateId}.md`);
  await writeFile(filePath, content, "utf8");

  // Update _index.md
  await updateUserIndex(templateId, meta, userTemplatesDir);

  return filePath;
}

/**
 * Update (or create) the user templates _index.md with a new entry.
 */
async function updateUserIndex(templateId, meta, userTemplatesDir) {
  const indexPath = join(userTemplatesDir, "_index.md");
  let existing = await readFileIfExists(indexPath);

  if (!existing) {
    existing = `# User Templates

Generated from successful analyses. Use with \`agentic-rig init <template>\`.

| ID | Name | Description | File |
|----|------|-------------|------|
`;
  }

  // Check if entry already exists
  if (existing.includes(`| ${templateId} |`)) {
    // Replace existing row
    const lines = existing.split("\n");
    const updated = lines.map((line) => {
      if (line.includes(`| ${templateId} |`)) {
        return `| ${templateId} | ${meta.name} | ${meta.description} | ${templateId}.md |`;
      }
      return line;
    });
    await writeFile(indexPath, updated.join("\n"), "utf8");
  } else {
    // Append new row
    const row = `| ${templateId} | ${meta.name} | ${meta.description} | ${templateId}.md |`;
    const content = existing.trimEnd() + "\n" + row + "\n";
    await writeFile(indexPath, content, "utf8");
  }
}
