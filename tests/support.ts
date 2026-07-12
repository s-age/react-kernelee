/**
 * Test-only polling helpers, mirroring `kernelee`'s own test-suite idiom
 * (see `kernelee/tests/buffer.test.ts`): `dispatch` runs on a serial
 * `CommandBus` off the synchronous call stack, so a test observing its
 * effect (a buffer mutation, in this package's tests) has no promise to
 * `await` — it polls until the effect lands or times out.
 *
 * DOM-facing assertions should prefer Testing Library's own `waitFor` /
 * `findBy*` (they additionally handle React's `act` wrapping); `until` is
 * for polling kernel/buffer state directly.
 */

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function until(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 1000; i += 1) {
    if (condition()) return;
    await sleep(1);
  }
  throw new Error('condition never held');
}
