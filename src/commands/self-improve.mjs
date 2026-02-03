import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { analyzeProject, generateClaudeMd, diffStrings } from "../analyze.mjs";
import { loadAllFeedback, generateInsights } from "../feedback.mjs";
import { readFileIfExists } from "../utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENT_RIG_ROOT = join(__dirname, "..", "..");

/**
 * CLI command: agentic-rig self-improve
 *
 * Runs analysis on agentic-rig's own codebase, compares current CLAUDE.md
 * to what the analysis would generate, and shows a diff with suggestions.
 */
export async function selfImprove(flags) {
  console.log("Self-Improvement Analysis\n");
  console.log(`Analyzing: ${AGENT_RIG_ROOT}\n`);

  // Step 1: Analyze own codebase
  const analysis = await analyzeProject(AGENT_RIG_ROOT);

  console.log("Project Analysis:");
  console.log(`  Type:       ${analysis.projectTypes.join(", ") || "unknown"}`);
  console.log(`  Size:       ${analysis.size} (${analysis.fileCount} files)`);
  console.log(`  Frameworks: ${analysis.frameworks.length > 0 ? analysis.frameworks.join(", ") : "none"}`);
  console.log(`  Tooling:    ${analysis.tooling.length > 0 ? analysis.tooling.join(", ") : "none"}`);
  console.log(`  Dirs:       ${analysis.directories.join(", ")}`);
  console.log();

  // Step 2: Generate what CLAUDE.md would look like from analysis
  const generated = generateClaudeMd(analysis);

  // Step 3: Read current CLAUDE.md
  const currentClaudeMd = await readFileIfExists(join(AGENT_RIG_ROOT, "CLAUDE.md"));

  if (currentClaudeMd) {
    console.log("CLAUDE.md Comparison:");
    const diff = diffStrings(currentClaudeMd, generated);
    const additions = diff.filter((d) => d.type === "add");
    const removals = diff.filter((d) => d.type === "remove");

    if (additions.length === 0 && removals.length === 0) {
      console.log("  No significant differences detected.");
    } else {
      if (additions.length > 0) {
        console.log(`\n  Potential additions (${additions.length} lines):`);
        for (const d of additions.slice(0, 15)) {
          console.log(`    + ${d.line}`);
        }
        if (additions.length > 15) {
          console.log(`    ... and ${additions.length - 15} more`);
        }
      }
      if (removals.length > 0) {
        console.log(`\n  Lines in current but not in generated (${removals.length}):`);
        console.log("  (These may be custom content — review before removing)");
      }
    }
  } else {
    console.log("No CLAUDE.md found. Generated content:");
    console.log(generated);
  }

  // Step 4: Check feedback data for self-improvement insights
  console.log("\n---\nFeedback Analysis:\n");

  const records = await loadAllFeedback(AGENT_RIG_ROOT);
  if (records.length === 0) {
    console.log("  No feedback data available yet.");
    console.log("  Run analyses to build feedback data for deeper insights.");
  } else {
    const insights = generateInsights(records);

    console.log(`  Sessions analyzed: ${insights.summary.totalSessions}`);
    console.log(`  Overall approval:  ${insights.summary.overallApprovalRate}%`);
    console.log();

    if (insights.lowValue.length > 0) {
      console.log("  Low-performing heuristics to review:");
      for (const h of insights.lowValue.slice(0, 5)) {
        console.log(`    - ${h.key}: ${h.approvalRate}% (${h.approved}/${h.total})`);
      }
      console.log();
    }

    if (insights.suggestions.length > 0) {
      console.log("  Improvement suggestions:");
      for (const s of insights.suggestions) {
        console.log(`    - ${s}`);
      }
      console.log();
    }
  }

  // Step 5: Structural suggestions
  console.log("Structural Suggestions:\n");

  const suggestions = [];

  // Check for missing common patterns
  if (!analysis.directories.includes("tests") && !analysis.directories.includes("test")) {
    suggestions.push("Add test directory — no test directory detected");
  }

  if (!analysis.tooling.includes("eslint") && !analysis.tooling.includes("biome")) {
    suggestions.push("Consider adding a linter (ESLint or Biome)");
  }

  if (!analysis.directories.includes(".github")) {
    suggestions.push("Add GitHub Actions for CI/CD");
  }

  // Check package.json scripts
  if (analysis.packageJson?.scripts) {
    const scripts = Object.keys(analysis.packageJson.scripts);
    if (!scripts.includes("test")) {
      suggestions.push("Add a `test` script to package.json");
    }
    if (!scripts.includes("lint")) {
      suggestions.push("Add a `lint` script to package.json");
    }
  }

  if (suggestions.length === 0) {
    console.log("  No structural issues detected.");
  } else {
    for (const s of suggestions) {
      console.log(`  - ${s}`);
    }
  }

  console.log("\nFor deeper analysis, use the /self-improve skill with Claude.");
}
