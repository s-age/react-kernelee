import { useCallback, useSyncExternalStore } from 'react';
import type { StateKey } from '@s-age/kernelee';
import { useKernel } from './useKernel.js';

/**
 * Subscribe to one buffer cell and re-render whenever it changes.
 *
 * The `view` half of "view reads (`useBuffer`), dispatches
 * (`useDispatch`), never touches `kernel.call` / `kernel.compose` /
 * `buffer.mutate` directly" — the only state a component may read is
 * whatever a `StateKey` names, and the only way to change it is dispatching
 * a command that eventually `mutate`s the buffer from Circuit/Compute code.
 *
 * Wraps `kernel.buffer.subscribe` / `kernel.buffer.getSnapshot` in
 * `useSyncExternalStore` — the shape `Buffer` was designed to hand straight
 * to it (see the `kernelee` `Buffer` doc comment). `subscribe` is
 * memoized with `useCallback` so its identity only changes when `kernel` or
 * `key` change, which keeps `useSyncExternalStore` from tearing down and
 * re-establishing the subscription on every render. The same `getSnapshot`
 * is passed as the `getServerSnapshot` argument: `Buffer.getSnapshot` is a
 * plain synchronous read with no browser-only dependency, so it is already
 * SSR-safe (no separate server-side value is needed).
 *
 * Throws `BufferError` (`'unallocated'`) if `key` was never allocated —
 * same as calling `kernel.buffer.read(key)` directly.
 */
export function useBuffer<S>(key: StateKey<S>): S {
  const kernel = useKernel();
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => kernel.buffer.subscribe(key, onStoreChange),
    [kernel, key],
  );
  const getSnapshot = useCallback((): S => kernel.buffer.getSnapshot(key), [kernel, key]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
