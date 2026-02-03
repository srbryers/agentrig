import { loadFeedback, loadAllFeedback, listFeedbackSessions } from "../feedback.mjs";
import {
  buildTemplateId,
  buildTemplateContent,
  buildDetectionRules,
  saveUserTemplate,
} from "../template-generator.mjs";
import { resolveProjectRoot, promptYesNo } from "../utils.mjs";

/**
 * CLI command: agentic-rig generate-template --from-session <id>
 *
 * Creates a reusable template from a successful analysis session's feedback data.
 */
export async function generateTemplate(flags) {
  const projectRoot = resolveProjectRoot(flags);
  const sessionId = flags.fromSession;

  // If no session specified, list available sessions
  if (!sessionId) {
    const sessions = await listFeedbackSessions(projectRoot);
    if (sessions.length === 0) {
      console.log("No feedback sessions found.");
      console.log("Run `agentic-rig init <template>` or `/project-setup` first to generate feedback data.");
      return;
    }

    console.log("Available sessions:\n");
    console.log("  ID                                   Rate  Type            Source  Template");
    console.log("  " + "-".repeat(80));
    for (const s of sessions) {
      const id = s.sessionId.padEnd(37);
      const rate = `${s.approvalRate}%`.padEnd(6);
      const type = s.projectType.padEnd(16);
      const source = s.source.padEnd(8);
      console.log(`  ${id}${rate}${type}${source}${s.templateId}`);
    }
    console.log(`\nUsage: agentic-rig generate-template --from-session <session-id>`);
    return;
  }

  // Load the session
  const record = await loadFeedback(sessionId, projectRoot);
  if (!record) {
    console.error(`Session not found: ${sessionId}`);
    console.error("Use `agentic-rig generate-template` without flags to list available sessions.");
    process.exit(1);
  }

  // Validate: check approval rate
  const approvalRate = record.summary?.approvalRate || 0;
  const approvedCount = record.summary?.approved || 0;

  if (approvedCount < 3) {
    console.error(`Session has only ${approvedCount} approved item(s). Need at least 3 to generate a template.`);
    process.exit(1);
  }

  if (approvalRate < 50) {
    console.log(`Warning: Session has ${approvalRate}% approval rate (below recommended 75%).`);
    const ok = await promptYesNo("Continue anyway?");
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  // Build template metadata
  const projectType = record.project?.type || "custom";
  const templateId = buildTemplateId(projectType);
  const meta = {
    id: templateId,
    name: projectType.charAt(0).toUpperCase() + projectType.slice(1),
    description: `Generated from analysis session ${sessionId.slice(0, 8)}`,
    detection: buildDetectionRules(record),
  };

  console.log(`\nGenerating template: ${meta.name}`);
  console.log(`  ID: ${templateId}`);
  console.log(`  Based on: ${approvedCount} approved items (${approvalRate}% approval rate)`);
  console.log(`  Source session: ${sessionId}`);

  // Extract approved items by category
  const approvedItems = (record.items || []).filter((i) => i.status === "approved");
  const categories = {};
  for (const item of approvedItems) {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  }

  // Build template content
  // Note: In CLI-generated feedback, we only have item metadata, not full content.
  // The template will have placeholder sections that the user should customize.
  const templateContent = buildTemplateContent({
    meta,
    claudeMd: categories.claude_md
      ? `### Project Overview\n\nGenerated from ${projectType} project analysis.\n\n### Build & Run\n\n(Customize based on your project)\n`
      : undefined,
    hooks: buildHooksFromItems(categories.hook || []),
    skills: buildSkillsPlaceholders(categories.skill || []),
    agents: buildAgentsPlaceholders(categories.agent || []),
    mcpServers: buildMcpFromItems(categories.mcp || []),
    externalSkills: (categories.external_skill || []).map((i) => ({
      name: i.name,
      repository: "",
      skill: i.name,
      description: `Recommended for ${projectType}`,
    })),
  });

  // Save the template
  const filePath = await saveUserTemplate(templateId, templateContent, meta, projectRoot);

  console.log(`\nTemplate saved to: ${filePath}`);
  console.log(`\nUse it with: agentic-rig init ${templateId}`);
  console.log("Edit the template file to customize detection rules and content.");
}

/**
 * Build a hooks object from feedback items.
 */
function buildHooksFromItems(hookItems) {
  const hooks = {};
  for (const item of hookItems) {
    const event = item.event || "PostToolUse";
    if (!hooks[event]) hooks[event] = [];
    hooks[event].push({
      matcher: item.name || "Write|Edit",
      command: `echo "Customize: ${item.name}"`,
    });
  }
  return hooks;
}

/**
 * Build skills placeholders from feedback items.
 */
function buildSkillsPlaceholders(skillItems) {
  const skills = {};
  for (const item of skillItems) {
    skills[item.name] = `---\nname: ${item.name}\ndescription: Customize this skill\ninvocation: user\nuser_invocation: /${item.name}\n---\n\n# ${item.name}\n\nCustomize this skill definition.`;
  }
  return skills;
}

/**
 * Build agent placeholders from feedback items.
 */
function buildAgentsPlaceholders(agentItems) {
  const agents = {};
  for (const item of agentItems) {
    agents[item.name] = `# ${item.name}\n\nCustomize this agent definition.`;
  }
  return agents;
}

/**
 * Build MCP servers object from feedback items.
 */
function buildMcpFromItems(mcpItems) {
  const servers = {};
  for (const item of mcpItems) {
    servers[item.name] = {
      command: "npx",
      args: [item.name],
      type: "stdio",
    };
  }
  return servers;
}
