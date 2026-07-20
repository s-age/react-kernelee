import { useCallback } from 'react';
import type { KernelSymbol } from '@s-age/kernelee';
import { useKernel } from './useKernel.js';

/**
 * Bind a `void`-payload symbol to a stable zero-argument dispatcher for use
 * in event handlers — the sole binding form for `KernelSymbol<void, O>`
 * commands (`useDispatch`'s symbol form rejects them at compile time; see
 * its doc comment for why).
 *
 * The returned closure declares no parameter and forwards nothing — handing
 * it to `onClick` (or any other DOM handler) can never leak the event object
 * into `kernel.dispatch`'s payload, which is exactly the class of bug this
 * hook exists to make uncompilable.
 */
export function useTrigger<O>(sym: KernelSymbol<void, O>): () => void {
  const kernel = useKernel();
  return useCallback(() => {
    kernel.dispatch(sym, undefined);
  }, [kernel, sym]);
}
