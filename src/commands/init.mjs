import { join } from "node:path";
import {
  resolveProjectRoot,
  writeFileWithDir,
  fileExists,
  readFileIfExists,
  mergeSettingsJson,
  mergeMcpJson,
  promptYesNo,
} from "../utils.mjs";
import {
  listTemplates,
  findTemplate,
  getTemplatesDir,
} from "../templates.mjs";
import {
  generateSessionId,
  createFeedbackRecord,
  saveFeedback,
} from "../feedback.mjs";
import { getAllTemplateScores } from "../scoring.mjs";

const ATTRIBUTION = `
---
> Configured with [\`agentic-rig\`](https://npmjs.com/package/agentic-rig)
`.trimStart();

export async function init(flags) {
  const projectRoot = resolveProjectRoot(flags);
  const templatesDir = getTemplatesDir();

  // --list: show available templates and exit
  if (flags.list) {
    const templates = await listTemplates(templatesDir, projectRoot);
    if (templates.length === 0) {
      console.log("No templates found.");
      return;
    }

    // Load quality scores (best-effort)
    let scores = new Map();
    try {
      scores = await getAllTemplateScores(projectRoot);
    } catch {
      // No feedback data yet
    }

    console.log("Available templates:\n");
    for (const t of templates) {
      const score = scores.get(t.id);
      const tierTag = score ? ` [${score.tier}]` : "";
      const sourceTag = t.source === "user" ? " (user)" : "";
      console.log(`  ${t.id.padEnd(20)} ${t.description}${tierTag}${sourceTag}`);
    }
    console.log(`\nUsage: agentic-rig init <template>`);
    return;
  }

  // Require a template ID
  if (!flags.templateId) {
    console.error("Missing template ID. Use --list to see available templates.");
    process.exit(1);
  }

  // Load the template
  const template = await findTemplate(flags.templateId, templatesDir, projectRoot);
  if (!template) {
    console.error(`Template not found: ${flags.templateId}`);
    console.error("Use --list to see available templates.");
    process.exit(1);
  }

  const targetDir = projectRoot;
  const dryRun = flags.dryRun;
  const force = flags.force;

  console.log(`\nTemplate: ${template.meta.name}`);
  console.log(`Target:   ${targetDir}`);
  if (dryRun) console.log(`Mode:     dry-run (no files will be written)\n`);
  else console.log();

  const filesToWrite = [];

  // 1. CLAUDE.md
  if (template.claude_md) {
    const claudeMdPath = join(targetDir, "CLAUDE.md");
    const existing = await readFileIfExists(claudeMdPath);
    let content;

    if (existing) {
      // Merge: append template content after existing, before attribution
      const cleaned = existing.replace(/\n?---\n> Configured with \[`agentic-rig`\].*[\s]*$/, "").trimEnd();
      content = cleaned + "\n\n" + template.claude_md.trim() + "\n\n" + ATTRIBUTION;
    } else {
      content = `# ${template.meta.name}\n\n` + template.claude_md.trim() + "\n\n" + ATTRIBUTION;
    }

    filesToWrite.push({ path: claudeMdPath, content, label: "CLAUDE.md" });
  }

  // 2. .claude/settings.json (hooks)
  if (template.hooks && Object.keys(template.hooks).length > 0) {
    const settingsPath = join(targetDir, ".claude", "settings.json");
    const existing = await readFileIfExists(settingsPath);
    const content = mergeSettingsJson(existing, template.hooks);
    filesToWrite.push({ path: settingsPath, content, label: ".claude/settings.json" });
  }

  // 3. .claude/.mcp.json (MCP servers)
  if (template.mcp_servers && Object.keys(template.mcp_servers).length > 0) {
    const mcpPath = join(targetDir, ".claude", ".mcp.json");
    const existing = await readFileIfExists(mcpPath);
    const content = mergeMcpJson(existing, template.mcp_servers);
    filesToWrite.push({ path: mcpPath, content, label: ".claude/.mcp.json" });
  }

  // 4. Skills
  if (template.skills && Object.keys(template.skills).length > 0) {
    for (const [name, skillContent] of Object.entries(template.skills)) {
      const skillPath = join(targetDir, ".claude", "skills", name, "SKILL.md");
      filesToWrite.push({ path: skillPath, content: skillContent, label: `.claude/skills/${name}/SKILL.md` });
    }
  }

  // 5. Agents
  if (template.agents && Object.keys(template.agents).length > 0) {
    for (const [name, agentContent] of Object.entries(template.agents)) {
      const agentPath = join(targetDir, ".claude", "agents", `${name}.md`);
      filesToWrite.push({ path: agentPath, content: agentContent, label: `.claude/agents/${name}.md` });
    }
  }

  // Show plan
  console.log("Files to generate:");
  for (const f of filesToWrite) {
    const exists = await fileExists(f.path);
    const isMergeable = f.label === "CLAUDE.md" ||
                        f.label === ".claude/settings.json" ||
                        f.label === ".claude/.mcp.json";
    const tag = exists ? (isMergeable ? " (merge)" : " (overwrite)") : " (create)";
    console.log(`  ${f.label}${tag}`);
  }
  console.log();

  // Dry run stops here
  if (dryRun) {
    console.log("Dry run complete. No files written.");
    return;
  }

  // Check for existing .claude/ directory — prompt if not --force
  const claudeDirExists = await fileExists(join(targetDir, ".claude"));
  if (claudeDirExists && !force) {
    let hasExisting = false;
    for (const f of filesToWrite) {
      if (await fileExists(f.path)) {
        hasExisting = true;
        break;
      }
    }
    if (hasExisting) {
      const ok = await promptYesNo("Existing config detected. Overwrite/merge?");
      if (!ok) {
        console.log("Aborted.");
        return;
      }
    }
  }

  // Write files
  let written = 0;
  for (const f of filesToWrite) {
    await writeFileWithDir(f.path, f.content);
    written++;
  }

  console.log(`Done. Generated ${written} file(s) from template "${template.meta.id}".`);
  const steps = [
    "Review CLAUDE.md and adjust to your preferences",
    "Check .claude/settings.json hooks",
  ];
  if (template.mcp_servers && Object.keys(template.mcp_servers).length > 0) {
    steps.push("MCP servers may need additional setup (API keys, installs)");
  }
  if (template.skills && Object.keys(template.skills).length > 0) {
    const skillNames = Object.keys(template.skills).map((s) => `/${s}`).join(", ");
    steps.push(`Try skills: ${skillNames}`);
  }
  console.log("\nNext steps:");
  steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  // Print external skill recommendations
  if (template.external_skills && template.external_skills.length > 0) {
    console.log("\nRecommended community skills:");
    for (const skill of template.external_skills) {
      console.log(`  ${skill.name} — npx skills add ${skill.repository} --skill ${skill.skill}`);
    }
    console.log("\nBrowse more at https://skills.sh");
  }

  // Capture feedback (CLI mode: all items are auto-approved)
  try {
    const feedbackItems = buildFeedbackItems(template);
    const record = createFeedbackRecord({
      sessionId: generateSessionId(),
      templateId: template.meta.id,
      templateConfidence: 1,
      projectType: template.meta.id,
      frameworks: [],
      projectSize: "unknown",
      source: "cli",
      items: feedbackItems,
    });
    await saveFeedback(record, projectRoot);
  } catch {
    // Feedback capture is best-effort; never block the user
  }
}

/**
 * Build feedback items from a template's generated content.
 * In CLI mode, all items are auto-approved.
 */
function buildFeedbackItems(template) {
  const items = [];

  if (template.claude_md) {
    items.push({
      id: "C1",
      category: "claude_md",
      name: "claude_md",
      status: "approved",
      source: "template",
    });
  }

  if (template.hooks) {
    for (const [event, hookList] of Object.entries(template.hooks)) {
      if (!Array.isArray(hookList)) continue;
      for (const hook of hookList) {
        items.push({
          id: `H-${event}-${hook.matcher || "all"}`,
          category: "hook",
          name: hook.matcher || "all",
          event,
          status: "approved",
          source: "template",
        });
      }
    }
  }

  if (template.skills) {
    for (const name of Object.keys(template.skills)) {
      items.push({
        id: `S-${name}`,
        category: "skill",
        name,
        status: "approved",
        source: "template",
      });
    }
  }

  if (template.agents) {
    for (const name of Object.keys(template.agents)) {
      items.push({
        id: `A-${name}`,
        category: "agent",
        name,
        status: "approved",
        source: "template",
      });
    }
  }

  if (template.mcp_servers) {
    for (const name of Object.keys(template.mcp_servers)) {
      items.push({
        id: `M-${name}`,
        category: "mcp",
        name,
        status: "approved",
        source: "template",
      });
    }
  }

  if (template.external_skills) {
    for (const skill of template.external_skills) {
      items.push({
        id: `E-${skill.name}`,
        category: "external_skill",
        name: skill.name,
        status: "approved",
        source: "template",
      });
    }
  }

  return items;
}
