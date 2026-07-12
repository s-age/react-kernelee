import { createContext } from 'react';
import type { Kernel } from '@s-age/kernelee';

/**
 * The kernel injected by `KernelProvider`, read by `useKernel`.
 *
 * `null` is the "no provider above this point" sentinel — a real `Kernel` is
 * never falsy-checked against, so `useKernel` can tell "not wrapped in a
 * provider" apart from "wrapped, kernel present" without a second flag.
 *
 * @internal Shared between `KernelProvider.tsx` and `useKernel.ts`; not part
 * of the package's public surface (`index.ts` does not re-export it) — both
 * hooks and consumers go through `KernelProvider` / `useKernel` instead of
 * touching the context object directly.
 */
export const KernelContext = createContext<Kernel | null>(null);
