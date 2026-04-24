import { Queue } from 'bullmq';

export interface RecordedJob {
  name: string;
  data: unknown;
  opts?: Record<string, unknown>;
}

/**
 * Test double for BullMQ Queue. Implements only what ReceiptsService uses today:
 * `add(name, data, opts?)`. Records every enqueue for assertions.
 *
 * No @Injectable() — wired via .overrideProvider(...).useValue(new FakeQueue()),
 * not instantiated by Nest DI.
 */
export class FakeQueue {
  jobs: RecordedJob[] = [];

  async add(name: string, data: unknown, opts?: Record<string, unknown>): Promise<{ id: string }> {
    this.jobs.push({ name, data, opts });
    return { id: `fake-${this.jobs.length}` };
  }

  reset(): void {
    this.jobs = [];
  }
}

// Compile-time check against the bullmq Queue surface we actually use.
// If ReceiptsService starts calling a Queue method beyond `add`, add it to
// the Pick below and implement it — drift becomes a build error.
const _queueSurfaceCheck: Pick<Queue, 'add'> = new FakeQueue() as unknown as Pick<Queue, 'add'>;
void _queueSurfaceCheck;
