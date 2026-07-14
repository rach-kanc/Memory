/**
 * App Trust Scoring Model
 *
 * Tracks per-app accept/reject outcomes and computes a trust coefficient
 * that scales the source_strength_score for future observations from that app.
 *
 * High rejection ratios lower an app's trust coefficient, reducing the weight
 * its future suggestions carry in the confidence pipeline.
 */

const MIN_SAMPLE_SIZE = 5;
const COLD_START_COEFFICIENT = 0.8;
const MIN_TRUST_FLOOR = 0.2;

const outcomeStore = new Map();

export const OUTCOMES = Object.freeze({
  ACCEPTED: "accepted",
  REJECTED: "rejected",
});

export function recordObservationOutcome(appId, outcome) {
  if (!appId || typeof appId !== "string" || !appId.trim()) return;
  const normalized = String(outcome ?? "").trim().toLowerCase();
  if (!Object.values(OUTCOMES).includes(normalized)) return;

  const record = outcomeStore.get(appId) ?? { accepted: 0, rejected: 0 };
  if (normalized === OUTCOMES.ACCEPTED) {
    record.accepted += 1;
  } else {
    record.rejected += 1;
  }
  outcomeStore.set(appId, record);
}

export function getAppOutcomes(appId) {
  const record = outcomeStore.get(String(appId ?? "")) ?? { accepted: 0, rejected: 0 };
  return { accepted: record.accepted, rejected: record.rejected, total: record.accepted + record.rejected };
}

export function getAppTrustCoefficient(appId) {
  const { accepted, total } = getAppOutcomes(appId);
  if (total < MIN_SAMPLE_SIZE) return COLD_START_COEFFICIENT;
  const raw = accepted / total;
  return Number(Math.max(MIN_TRUST_FLOOR, Math.min(1, raw)).toFixed(4));
}

export function applyTrustToScore(baseScore, appId) {
  const base = Number(baseScore ?? 0);
  if (!Number.isFinite(base)) return 0;
  const trust = getAppTrustCoefficient(appId);
  return Number(Math.max(0, Math.min(1, base * trust)).toFixed(4));
}

export function resetAppOutcomes(appId) {
  if (appId) {
    outcomeStore.delete(String(appId));
  } else {
    outcomeStore.clear();
  }
}