import { loadAllFeedback, aggregateFeedback } from "./feedback.mjs";

/**
 * Quality tier thresholds.
 */
const TIERS = [
  { name: "validated", minRate: 85, minSessions: 5 },
  { name: "acceptable", minRate: 65, minSessions: 3 },
  { name: "needs-review", minRate: 0, minSessions: 3 },
];

/**
 * Compute quality score for a single template.
 *
 * @param {string} templateId
 * @param {object} templateStats - { sessions, totalItems, approved }
 * @returns {{ approvalRate: number, sessions: number, tier: string }}
 */
export function computeTemplateScore(templateId, templateStats) {
  const { sessions = 0, totalItems = 0, approved = 0 } = templateStats;
  const approvalRate = totalItems > 0 ? Math.round((approved / totalItems) * 100) : 0;
  const tier = getQualityTier(approvalRate, sessions);

  return {
    templateId,
    approvalRate,
    sessions,
    totalItems,
    approved,
    tier,
  };
}

/**
 * Determine quality tier from approval rate and session count.
 */
export function getQualityTier(approvalRate, sessions) {
  if (sessions < 3) return "insufficient-data";

  for (const tier of TIERS) {
    if (approvalRate >= tier.minRate && sessions >= tier.minSessions) {
      return tier.name;
    }
  }

  return "insufficient-data";
}

/**
 * Format a quality tier for display with indicator.
 */
export function formatScoreDisplay(score) {
  const indicators = {
    "validated": "[+]",
    "acceptable": "[~]",
    "needs-review": "[!]",
    "insufficient-data": "[ ]",
  };

  const indicator = indicators[score.tier] || "[ ]";
  return `${indicator} ${score.tier} (${score.approvalRate}% across ${score.sessions} sessions)`;
}

/**
 * Get quality scores for all templates that have feedback data.
 * Returns Map<templateId, score>.
 */
export async function getAllTemplateScores(projectRoot) {
  const records = await loadAllFeedback(projectRoot);
  const agg = aggregateFeedback(records);
  const scores = new Map();

  for (const [tid, stats] of Object.entries(agg.byTemplate)) {
    if (tid === "none") continue;
    scores.set(tid, computeTemplateScore(tid, stats));
  }

  return scores;
}
