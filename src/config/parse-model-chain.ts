const DEFAULT_MODEL = 'google/gemini-2.5-flash';

export function parseModelChain(
  chainEnv: string | undefined,
  modelEnv: string | undefined,
): string[] {
  if (chainEnv) {
    const parts = chainEnv
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 0) return parts;
  }
  if (modelEnv && modelEnv.trim().length > 0) {
    return [modelEnv.trim()];
  }
  return [DEFAULT_MODEL];
}
