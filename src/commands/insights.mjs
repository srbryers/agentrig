import { loadAllFeedback, generateInsights } from "../feedback.mjs";
import { resolveProjectRoot } from "../utils.mjs";

/**
 * CLI command: agentic-rig insights
 *
 * Aggregates feedback data to show which heuristics and templates
 * produce high-value vs low-value recommendations.
 */
export async function insights(flags) {
  const projectRoot = resolveProjectRoot(flags);
  const records = await loadAllFeedback(projectRoot);

  if (records.length === 0) {
    console.log("No feedback data found.");
    console.log("Run `agentic-rig init <template>` or `/project-setup` to generate feedback data.");
    return;
  }

  const result = generateInsights(records);

  // Summary
  console.log("Feedback Insights\n");
  console.log(`  Sessions:       ${result.summary.totalSessions}`);
  console.log(`  Total items:    ${result.summary.totalItems}`);
  console.log(`  Approval rate:  ${result.summary.overallApprovalRate}%`);
  console.log(`  Unique items:   ${result.summary.uniqueHeuristics}`);
  console.log();

  // High-value heuristics
  if (result.highValue.length > 0) {
    console.log("High-Value (>90% approval):");
    for (const h of result.highValue) {
      const pct = `${h.approvalRate}%`.padStart(4);
      console.log(`  ${h.key.padEnd(40)} ${pct} (${h.approved}/${h.total})`);
    }
    console.log();
  }

  // Low-value heuristics
  if (result.lowValue.length > 0) {
    console.log("Low-Value (<60% approval):");
    for (const h of result.lowValue) {
      const pct = `${h.approvalRate}%`.padStart(4);
      console.log(`  ${h.key.padEnd(40)} ${pct} (${h.approved}/${h.total})`);
    }
    console.log();
  }

  // No significant data yet
  if (result.highValue.length === 0 && result.lowValue.length === 0) {
    console.log("Not enough data for high/low-value analysis (need 3+ occurrences per item).");
    console.log();
  }

  // Suggestions
  if (result.suggestions.length > 0) {
    console.log("Suggestions:");
    result.suggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s}`);
    });
    console.log();
  }

  console.log("Run more analyses to improve insight accuracy.");
}
