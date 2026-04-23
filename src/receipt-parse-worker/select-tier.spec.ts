import { selectTierModel } from './select-tier';

describe('selectTierModel', () => {
  const chain = ['tier-0', 'tier-1', 'tier-2'];

  it('attempt 1 (attemptsMade=0) returns chain[0]', () => {
    expect(selectTierModel(0, chain)).toBe('tier-0');
  });

  it('attempt 2 (attemptsMade=1) returns chain[1]', () => {
    expect(selectTierModel(1, chain)).toBe('tier-1');
  });

  it('attempt 3 (attemptsMade=2) returns chain[2]', () => {
    expect(selectTierModel(2, chain)).toBe('tier-2');
  });

  it('clamps to last tier when attemptsMade exceeds chain length', () => {
    expect(selectTierModel(5, chain)).toBe('tier-2');
  });

  it('chain of length 1 returns the single model every attempt', () => {
    expect(selectTierModel(0, ['only'])).toBe('only');
    expect(selectTierModel(1, ['only'])).toBe('only');
    expect(selectTierModel(99, ['only'])).toBe('only');
  });

  it('throws when chain is empty', () => {
    expect(() => selectTierModel(0, [])).toThrow(
      'ai.modelChain is empty — check AI_MODEL_CHAIN env configuration',
    );
  });
});
