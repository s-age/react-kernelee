import { useContext } from 'react';
import type { Kernel } from '@s-age/kernelee';
import { KernelContext } from './context.js';

/**
 * Read the `Kernel` injected by the nearest `KernelProvider` above this
 * component.
 *
 * Throws — with a message naming the missing provider, not a generic
 * "cannot read property of null" — when called outside one. This is a
 * programming error (a forgotten `<KernelProvider>` at the composition
 * root), the same class of failure `kernelee` itself surfaces as an
 * immediate throw (`KernelError` `'unbound'`/`'duplicate'`,
 * `BufferError` `'unallocated'`) rather than a silent fallback.
 *
 * Most components should reach for `useBuffer` / `useDispatch` /
 * `useKernelError` instead — `useKernel` itself is the escape hatch for
 * code that needs the kernel directly (e.g. `kernel.dispatch` behind a
 * custom hook). It does not call `kernel.call` / `kernel.compose` /
 * `buffer.mutate` on your behalf — that stays the caller's responsibility,
 * and the view layer's own discipline is read (`useBuffer`) + dispatch
 * only.
 */
export function useKernel(): Kernel {
  const kernel = useContext(KernelContext);
  if (kernel === null) {
    throw new Error(
      'useKernel() was called outside a <KernelProvider>. Wrap your composition root in ' +
        '<KernelProvider kernel={kernel}>…</KernelProvider> before using useKernel / useBuffer / ' +
        'useDispatch / useKernelError.',
    );
  }
  return kernel;
}
