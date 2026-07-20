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
 * `void`-payload commands are rejected by useDispatch's symbol form — use
 * `useTrigger` instead. The exclusion is structural, not a style
 * preference: `kernel.dispatch`'s phantom payload type is erased at
 * runtime, so a single forwarding code path cannot tell a `void` contract
 * from any other at the point it hands the argument to `kernel.dispatch`.
 * The only way to keep a `void` contract from ever receiving a forwarded
 * argument (e.g. a React `SyntheticEvent` from `onClick={dispatch}`) is to
 * make that binding uncompilable and push `void` commands onto a hook that
 * never accepts an argument in the first place. The exclusive three-way
 * split is: **void → `useTrigger` / non-void → `useDispatch(sym)` / action →
 * `useDispatch()`**.
 *
 * The *no-symbol* overload is the Redux shape: `useDispatch()` hands back one
 * generic dispatcher for the whole component, fed with actions built by
 * `actionsOf` creators — `dispatch(SimActions.setSpeed(30))`. Same stability
 * guarantee (one `useCallback` on the kernel), and a component firing many
 * commands needs one hook instead of one per symbol.
 */

/** Rejects exactly-void payload symbols from useDispatch's symbol form.
 *  The brand's property name IS the error message the compiler shows. */
type NoVoidPayload<P> = [P] extends [void]
  ? [void] extends [P]
    ? { 'void-payload commands must use useTrigger — useDispatch(sym) forwards its argument': never }
    : unknown
  : unknown;

export function useDispatch(): <P, O>(action: Action<P, O>) => void;
export function useDispatch<P, O>(sym: KernelSymbol<P, O> & NoVoidPayload<P>): (payload: P) => void;
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
