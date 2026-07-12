# react-kernelee

React bindings for [`kernelee`](https://github.com/s-age/kernelee)'s `Buffer` — the observable-state
half of the kernel. Independent plugin package: `kernelee` has no dependency
on this package, or on React at all.

```sh
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run build     # tsc -p tsconfig.build.json → dist/ (declarations included)
```

## Dependency direction

```
react-kernelee  →  kernelee
     ↑
   (your app)
```

`kernelee` never imports React, and this package never modifies `kernelee` —
it only consumes the public surface documented in `kernelee`'s own README:
`Kernel`, `StateKey<S>`, `Buffer.subscribe` / `Buffer.getSnapshot`,
`KernelSymbol<P, O>`, and `KernelErrorState`. **The kernelee core knows
nothing about React** — it is a plain TS core usable from a CLI, a server, a Swift-adjacent test
harness, or (via this package) a React tree; nothing about its design assumes
a UI framework.

## Usage

Compose the kernel once, at the app root, exactly as a non-React consumer
would — then inject it with `KernelProvider`:

```tsx
import { createRoot } from 'react-dom/client';
import { KernelBuilder, BufferBuilder } from '@s-age/kernelee';
import { KernelProvider } from '@s-age/react-kernelee';
import { App } from './App.js';

const bufferBuilder = new BufferBuilder();
// ...bufferBuilder.allocate(MyState), ...builder.register(...), wiring, etc.
const kernel = new KernelBuilder().build({ buffer: bufferBuilder });

createRoot(document.getElementById('root')!).render(
  <KernelProvider kernel={kernel}>
    <App />
  </KernelProvider>,
);
```

Inside the tree, components read state and fire commands — nothing else:

```tsx
import { useBuffer, useDispatch, useKernelError } from 'react-kernelee';
import { GridState, refreshGrid } from './contract.js';

function GridView() {
  const grid = useBuffer(GridState);          // re-renders on every mutate
  const refresh = useDispatch(refreshGrid);   // stable fn, fire-and-forget
  const error = useKernelError();             // KernelErrorState.message sugar

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      <button onClick={refresh}>Refresh</button>
      {/* render grid */}
    </div>
  );
}
```

## API

- **`<KernelProvider kernel={kernel}>{children}</KernelProvider>`** — injects
  a `Kernel` via React context. Mount once, at (or near) the composition
  root. Nested providers shadow the outer kernel for their subtree (useful in
  tests: wrap a component under test with its own throwaway kernel).

- **`useKernel(): Kernel`** — reads the kernel injected by the nearest
  `KernelProvider`. Throws a clear error naming the missing provider when
  called outside one. Most components should prefer `useBuffer` /
  `useDispatch` / `useKernelError`; `useKernel` is the escape hatch for code
  that needs the kernel handle directly.

- **`useBuffer(key: StateKey<S>): S`** — subscribes to one buffer cell and
  re-renders on every `mutate`. Wraps `kernel.buffer.subscribe` /
  `kernel.buffer.getSnapshot` in `useSyncExternalStore`, with `subscribe`
  (and `getSnapshot`) stabilized via `useCallback` so identity only changes
  when `kernel` or `key` change — otherwise `useSyncExternalStore` would tear
  down and re-establish the subscription on every render. The same
  `getSnapshot` doubles as the `getServerSnapshot` argument (a plain
  synchronous read has no browser-only dependency, so it is SSR-safe as is).
  Throws `BufferError` (`'unallocated'`) if `key` was never allocated — same
  as calling `kernel.buffer.read(key)` directly.

- **`useDispatch(sym: KernelSymbol<P, O>): (payload: P) => void`** (or
  `useDispatch(sym: KernelSymbol<void, O>): () => void` for `void`-payload
  commands — sugar mirroring `kernel.call(sym)`'s own void overload) — binds
  a symbol to a component-stable dispatcher for event handlers. `dispatch`
  is already fire-and-forget and forward-only (no return value; failures go
  to the error sink, never to the caller); this hook only gives the call a
  stable identity via `useCallback`.

- **`useKernelError(): string | null`** — sugar for
  `useBuffer(KernelErrorState).message`. Observes the *default* error sink
  only: an app that injects its own `onError` at `build()` replaces that sink
  entirely, so this hook always reads `null` in that case — read your own
  error state via `useBuffer` instead.

## View-layer discipline

**A component only reads (`useBuffer`, or its sugar `useKernelError`) and
dispatches (`useDispatch`).** It never calls `kernel.call`, `kernel.compose`,
`kernel.run`, or `kernel.buffer.mutate` directly — those belong to the
Circuit/Compute-equivalent layer that owns transition logic and writes the
buffer. `useKernel()` exists for the rare case a component needs the raw
kernel handle, but reaching for it to call/compose/mutate inline reintroduces
the coupling this package's other hooks exist to avoid.

## License

[MIT](LICENSE) © s-age
