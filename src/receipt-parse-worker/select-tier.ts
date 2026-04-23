/**
 * Returns the model to use for a given BullMQ attempt.
 *
 * Tier is a pure function of attemptsMade (BullMQ-provided, 0-indexed). The
 * min() clamp is defensive — under the module invariant that BullMQ `attempts`
 * equals chain length, attemptsMade never exceeds chain.length - 1 on a real
 * job.
 */
export function selectTierModel(
  attemptsMade: number,
  chain: readonly string[],
): string {
  if (chain.length === 0) {
    throw new Error(
      'ai.modelChain is empty — check AI_MODEL_CHAIN env configuration',
    );
  }
  const tier = Math.min(attemptsMade, chain.length - 1);
  return chain[tier];
}
