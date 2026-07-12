import { KernelErrorState } from '@s-age/kernelee';
import { useBuffer } from './useBuffer.js';

/**
 * Sugar for `useBuffer(KernelErrorState).message` — the message rendered by
 * an error banner, or `null` when the last dispatch (that reached the
 * default error sink) has not failed / has already been cleared.
 *
 * Only observes the *default* sink: an app that injects its own `onError`
 * at `build()` replaces that sink entirely, so `KernelErrorState` never
 * receives anything and this hook always reads `null` — such an app should
 * read its own custom error state via `useBuffer` instead.
 */
export function useKernelError(): string | null {
  return useBuffer(KernelErrorState).message;
}
