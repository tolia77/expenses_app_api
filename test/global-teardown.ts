export default async function globalTeardown(): Promise<void> {
  const container = globalThis.__PG_CONTAINER__;
  if (container) await container.stop();
}
