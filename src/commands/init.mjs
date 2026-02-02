import { join } from "node:path";
import {
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

const ATTRIBUTION = `
---
> Configured with [\`@srbryers/agent-rig\`](https://npmjs.com/package/@srbryers/agent-rig)
`.trimStart();

export async function init(flags) {
  const templatesDir = getTemplatesDir();

  // --list: show available templates and exit
  if (flags.list) {
    const templates = await listTemplates(templatesDir);
    if (templates.length === 0) {
      console.log("No templates found.");
      return;
    }
    console.log("Available templates:\n");
    for (const t of templates) {
      console.log(`  ${t.id.padEnd(20)} ${t.description}`);
    }
    console.log(`\nUsage: agentrig init <template>`);
    return;
  }

  // Require a template ID
  if (!flags.templateId) {
    console.error("Missing template ID. Use --list to see available templates.");
    process.exit(1);
  }

  // Load the template
  const template = await findTemplate(flags.templateId, templatesDir);
  if (!template) {
    console.error(`Template not found: ${flags.templateId}`);
    console.error("Use --list to see available templates.");
    process.exit(1);
  }

  const targetDir = flags.dir || process.cwd();
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
      const cleaned = existing.replace(/\n---\n> Configured with \[`@srbryers\/agent-rig`\].*\n?$/, "").trimEnd();
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
    const tag = exists ? " (merge)" : " (create)";
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
}
