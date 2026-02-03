import { join } from "node:path";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

/**
 * Returns the feedback storage directory path for a project.
 */
export function getFeedbackDir(projectRoot) {
  return join(projectRoot, ".claude", "agentic-rig", "feedback");
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId() {
  return randomUUID();
}

/**
 * Derive a heuristic key from a recommendation item.
 * Used for aggregation across sessions.
 * Format: "category:name" e.g. "hook:PostToolUse:prettier", "mcp:context7", "skill:gen-test"
 */
export function deriveHeuristicKey(item) {
  const category = item.category || "unknown";
  const name = item.name || item.id || "unnamed";

  switch (category) {
    case "hook":
      return `hook:${item.event || ""}:${name}`;
    case "mcp":
      return `mcp:${name}`;
    case "skill":
      return `skill:${name}`;
    case "agent":
      return `agent:${name}`;
    case "claude_md":
      return `claude_md:${name}`;
    case "external_skill":
      return `external_skill:${name}`;
    default:
      return `${category}:${name}`;
  }
}

/**
 * Create a feedback record from a config generation session.
 *
 * @param {object} options
 * @param {string} options.sessionId - Unique session identifier
 * @param {string} options.templateId - Template used (or "none")
 * @param {number} options.templateConfidence - Match confidence (0-1)
 * @param {string} options.projectType - Detected project type
 * @param {string[]} options.frameworks - Detected frameworks
 * @param {string} options.projectSize - "small" | "medium" | "large"
 * @param {string} options.source - "cli" | "skill"
 * @param {Array<object>} options.items - Recommendation items with status
 * @returns {object} The feedback record
 */
export function createFeedbackRecord(options) {
  const {
    sessionId,
    templateId = "none",
    templateConfidence = 0,
    projectType = "unknown",
    frameworks = [],
    projectSize = "unknown",
    source = "cli",
    items = [],
  } = options;

  const approved = items.filter((i) => i.status === "approved").length;
  const skipped = items.filter((i) => i.status === "skipped").length;
  const modified = items.filter((i) => i.status === "modified").length;
  const total = items.length;

  return {
    sessionId,
    timestamp: new Date().toISOString(),
    source,
    project: {
      type: projectType,
      frameworks,
      size: projectSize,
    },
    template: {
      id: templateId,
      confidence: templateConfidence,
    },
    items: items.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      event: item.event || undefined,
      status: item.status,
      source: item.source || "heuristic",
      heuristicKey: deriveHeuristicKey(item),
    })),
    summary: {
      total,
      approved,
      skipped,
      modified,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    },
  };
}

/**
 * Save a feedback record to disk.
 */
export async function saveFeedback(record, projectRoot) {
  const feedbackDir = getFeedbackDir(projectRoot);
  await mkdir(feedbackDir, { recursive: true });
  const filePath = join(feedbackDir, `${record.sessionId}.json`);
  await writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  return filePath;
}

/**
 * Load a single feedback record by session ID.
 */
export async function loadFeedback(sessionId, projectRoot) {
  const feedbackDir = getFeedbackDir(projectRoot);
  const filePath = join(feedbackDir, `${sessionId}.json`);
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load all feedback records from disk.
 * Returns array sorted by timestamp (oldest first).
 */
export async function loadAllFeedback(projectRoot) {
  const feedbackDir = getFeedbackDir(projectRoot);
  let files;
  try {
    files = await readdir(feedbackDir);
  } catch {
    return [];
  }

  const records = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const content = await readFile(join(feedbackDir, file), "utf8");
      records.push(JSON.parse(content));
    } catch {
      // Skip corrupted files
    }
  }

  records.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  return records;
}

/**
 * Aggregate feedback across all sessions.
 * Returns overall stats and per-heuristic breakdown.
 */
export function aggregateFeedback(records) {
  if (records.length === 0) {
    return {
      totalSessions: 0,
      totalItems: 0,
      overallApprovalRate: 0,
      byHeuristic: {},
      byTemplate: {},
      projectTypes: {},
    };
  }

  const byHeuristic = {};
  const byTemplate = {};
  const projectTypes = {};
  let totalItems = 0;
  let totalApproved = 0;

  for (const record of records) {
    // Track project types
    const pt = record.project?.type || "unknown";
    projectTypes[pt] = (projectTypes[pt] || 0) + 1;

    // Track template usage
    const tid = record.template?.id || "none";
    if (!byTemplate[tid]) {
      byTemplate[tid] = { sessions: 0, totalItems: 0, approved: 0 };
    }
    byTemplate[tid].sessions++;

    for (const item of record.items || []) {
      totalItems++;
      if (item.status === "approved") totalApproved++;

      // Per-heuristic tracking
      const key = item.heuristicKey || deriveHeuristicKey(item);
      if (!byHeuristic[key]) {
        byHeuristic[key] = { total: 0, approved: 0, skipped: 0, modified: 0 };
      }
      byHeuristic[key].total++;
      if (item.status === "approved") byHeuristic[key].approved++;
      else if (item.status === "skipped") byHeuristic[key].skipped++;
      else if (item.status === "modified") byHeuristic[key].modified++;

      // Per-template item tracking
      byTemplate[tid].totalItems++;
      if (item.status === "approved") byTemplate[tid].approved++;
    }
  }

  return {
    totalSessions: records.length,
    totalItems,
    overallApprovalRate: totalItems > 0 ? Math.round((totalApproved / totalItems) * 100) : 0,
    byHeuristic,
    byTemplate,
    projectTypes,
  };
}

/**
 * Aggregate feedback by heuristic key with approval rates.
 * Returns sorted array of { key, total, approved, skipped, modified, approvalRate }.
 */
export function aggregateByHeuristic(records) {
  const agg = aggregateFeedback(records);
  const results = [];

  for (const [key, data] of Object.entries(agg.byHeuristic)) {
    results.push({
      key,
      total: data.total,
      approved: data.approved,
      skipped: data.skipped,
      modified: data.modified,
      approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
    });
  }

  results.sort((a, b) => b.approvalRate - a.approvalRate);
  return results;
}

/**
 * Generate actionable insights from aggregated feedback.
 * Returns { highValue, lowValue, suggestions }.
 */
export function generateInsights(records) {
  const heuristics = aggregateByHeuristic(records);
  const agg = aggregateFeedback(records);

  const HIGH_THRESHOLD = 90;
  const LOW_THRESHOLD = 60;
  const MIN_SAMPLES = 3;

  const highValue = heuristics.filter(
    (h) => h.approvalRate >= HIGH_THRESHOLD && h.total >= MIN_SAMPLES
  );

  const lowValue = heuristics.filter(
    (h) => h.approvalRate < LOW_THRESHOLD && h.total >= MIN_SAMPLES
  );

  const suggestions = [];

  // Suggest making low-approval items opt-in
  for (const h of lowValue) {
    suggestions.push(
      `Consider making ${h.key} opt-in (${h.approvalRate}% approval, ${h.approved}/${h.total})`
    );
  }

  // Flag templates with low approval
  for (const [tid, data] of Object.entries(agg.byTemplate)) {
    if (tid === "none") continue;
    if (data.sessions >= 3) {
      const rate = data.totalItems > 0 ? Math.round((data.approved / data.totalItems) * 100) : 0;
      if (rate < 70) {
        suggestions.push(
          `Review ${tid} template — ${rate}% approval across ${data.sessions} sessions`
        );
      }
    }
  }

  // Detect unserved project types (seen multiple times, no template)
  for (const [pt, count] of Object.entries(agg.projectTypes)) {
    if (pt === "unknown") continue;
    if (count >= 3) {
      // Check if there's a template for this project type
      const hasTemplate = Object.keys(agg.byTemplate).some(
        (tid) => tid !== "none" && tid.includes(pt.toLowerCase())
      );
      if (!hasTemplate) {
        suggestions.push(
          `No template for [${pt}] (seen ${count} times) — consider creating one`
        );
      }
    }
  }

  return {
    highValue,
    lowValue,
    suggestions,
    summary: {
      totalSessions: agg.totalSessions,
      totalItems: agg.totalItems,
      overallApprovalRate: agg.overallApprovalRate,
      uniqueHeuristics: heuristics.length,
    },
  };
}

/**
 * List all feedback session IDs with basic metadata.
 * Returns array of { sessionId, timestamp, templateId, approvalRate, source }.
 */
export async function listFeedbackSessions(projectRoot) {
  const records = await loadAllFeedback(projectRoot);
  return records.map((r) => ({
    sessionId: r.sessionId,
    timestamp: r.timestamp,
    templateId: r.template?.id || "none",
    approvalRate: r.summary?.approvalRate || 0,
    source: r.source || "unknown",
    projectType: r.project?.type || "unknown",
  }));
}
