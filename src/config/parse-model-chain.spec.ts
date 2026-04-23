import { parseModelChain } from './parse-model-chain';

describe('parseModelChain', () => {
  it('returns parsed chain when AI_MODEL_CHAIN is a comma-separated list', () => {
    expect(parseModelChain('a,b,c', undefined)).toEqual(['a', 'b', 'c']);
  });

  it('trims whitespace around entries', () => {
    expect(parseModelChain(' a , b , c ', undefined)).toEqual(['a', 'b', 'c']);
  });

  it('filters out empty entries from double commas', () => {
    expect(parseModelChain('a,,b,', undefined)).toEqual(['a', 'b']);
  });

  it('falls back to AI_MODEL as chain-of-one when AI_MODEL_CHAIN is undefined', () => {
    expect(parseModelChain(undefined, 'google/gemini-2.5-flash')).toEqual([
      'google/gemini-2.5-flash',
    ]);
  });

  it('falls back to AI_MODEL when AI_MODEL_CHAIN is empty string', () => {
    expect(parseModelChain('', 'google/gemini-2.5-flash')).toEqual([
      'google/gemini-2.5-flash',
    ]);
  });

  it('falls back to AI_MODEL when AI_MODEL_CHAIN contains only whitespace/commas', () => {
    expect(parseModelChain(' , , ', 'google/gemini-2.5-flash')).toEqual([
      'google/gemini-2.5-flash',
    ]);
  });

  it('falls back to default when both env vars are unset', () => {
    expect(parseModelChain(undefined, undefined)).toEqual([
      'google/gemini-2.5-flash',
    ]);
  });

  it('AI_MODEL_CHAIN takes precedence over AI_MODEL when both are set', () => {
    expect(parseModelChain('chain-a,chain-b', 'single-model')).toEqual([
      'chain-a',
      'chain-b',
    ]);
  });
});
