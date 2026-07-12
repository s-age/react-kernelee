import type { ReactElement, ReactNode } from 'react';
import type { Kernel } from '@s-age/kernelee';
import { KernelContext } from './context.js';

/** Props for {@link KernelProvider}. */
export interface KernelProviderProps {
  /** The composed kernel — built once at the composition root, then injected. */
  readonly kernel: Kernel;
  readonly children?: ReactNode;
}

/**
 * Injects a `Kernel` into the React tree via context, so `useKernel` /
 * `useBuffer` / `useDispatch` / `useKernelError` can reach it without prop
 * drilling. Mount exactly one of these at (or near) the composition root —
 * the same place a non-React app would call `KernelBuilder.build()`.
 *
 * ```tsx
 * const kernel = builder.build({ buffer: bufferBuilder });
 *
 * createRoot(document.getElementById('root')!).render(
 *   <KernelProvider kernel={kernel}>
 *     <App />
 *   </KernelProvider>,
 * );
 * ```
 */
export function KernelProvider({ kernel, children }: KernelProviderProps): ReactElement {
  return <KernelContext.Provider value={kernel}>{children}</KernelContext.Provider>;
}
