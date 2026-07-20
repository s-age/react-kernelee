import { render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { BufferBuilder, KernelBuilder, defineCallable, fail, portV, type Kernel } from '@s-age/kernelee';
import { KernelProvider, useKernelError } from '../src/index.js';

// `KernelBuilder.registerVerb` is @internal (stripped from the emitted .d.ts) —
// bind verb-returning handlers through `defineCallable`/`portV`/`wire`, the
// public idiom. The minted symbol id is `<name>.<key>`, so the assertion below
// keeps the same `react-kernelee.useKernelError.boom` prefix.
const BoomPort = defineCallable('react-kernelee.useKernelError', {
  boom: portV<void, void>('always fails'),
});
const boom = BoomPort.boom;

function buildKernel(): Kernel {
  const builder = new KernelBuilder();
  BoomPort.wire(
    {
      boom: (_payload: void) => fail(new Error('kaboom')),
    },
    builder,
  );
  // No onError injected — failures land on the default sink, KernelErrorState.
  return builder.build({ buffer: new BufferBuilder() });
}

function ErrorBanner() {
  const message = useKernelError();
  return <span data-testid="error">{message ?? ''}</span>;
}

test('useKernelErrorStartsNullAndStaysNullBeforeAnyFailure', () => {
  const kernel = buildKernel();
  render(
    <KernelProvider kernel={kernel}>
      <ErrorBanner />
    </KernelProvider>,
  );
  expect(screen.getByTestId('error').textContent).toBe('');
});

test('useKernelErrorObservesTheDefaultSinkAsSymbolIdColonMessage', async () => {
  const kernel = buildKernel();
  render(
    <KernelProvider kernel={kernel}>
      <ErrorBanner />
    </KernelProvider>,
  );

  kernel.dispatch(boom, undefined);

  await waitFor(() => {
    expect(screen.getByTestId('error').textContent).toBe('react-kernelee.useKernelError.boom: kaboom');
  });
});
