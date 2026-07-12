import { useCallback } from 'react';
import type { Action, KernelSymbol } from '@s-age/kernelee';
import { useKernel } from './useKernel.js';

/**
 * Bind a symbol to a stable dispatcher function for use in event handlers —
 * the `dispatch` half of the view layer's read/dispatch discipline.
 *
 * `kernel.dispatch` is already fire-and-forget and forward-only (no return
 * value, failures go to the error sink / `KernelErrorState`, never to the
 * caller) — `useDispatch` does not add behavior on top, it only gives that
 * call a component-stable identity so it can be handed to `onClick` et al.
 * without retriggering effects/memoization that depend on it.
 *
 * The no-payload overload is sugar for `KernelSymbol<void, O>` commands —
 * `useDispatch(sym)` becomes `() => void`, mirroring `kernel.call(sym)`'s
 * own void-payload overload (`kernelee`'s `Kernel.call` does the same
 * for the same reason: most commands in a UI are `void`-payload triggers,
 * e.g. "reload", and `dispatch(sym, undefined)` at every call site would be
 * noise).
 *
 * The *no-symbol* overload is the Redux shape: `useDispatch()` hands back one
 * generic dispatcher for the whole component, fed with actions built by
 * `actionsOf` creators — `dispatch(SimActions.setSpeed(30))`. Same stability
 * guarantee (one `useCallback` on the kernel), and a component firing many
 * commands needs one hook instead of one per symbol.
 */
export function useDispatch(): <P, O>(action: Action<P, O>) => void;
export function useDispatch<O>(sym: KernelSymbol<void, O>): () => void;
export function useDispatch<P, O>(sym: KernelSymbol<P, O>): (payload: P) => void;
export function useDispatch<P, O>(
  sym?: KernelSymbol<P, O>,
): (arg?: P | Action<unknown, unknown>) => void {
  const kernel = useKernel();
  return useCallback(
    (arg?: P | Action<unknown, unknown>): void => {
      if (sym === undefined) {
        kernel.dispatch(arg as Action<unknown, unknown>);
      } else {
        kernel.dispatch(sym, arg as P);
      }
    },
    [kernel, sym],
  );
}
