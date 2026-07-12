import { render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { BufferBuilder, KernelBuilder, fail, symbol, type Kernel } from '@s-age/kernelee';
import { KernelProvider, useKernelError } from '../src/index.js';

const boom = symbol<void, void>('react-kernelee.useKernelError.boom');

function buildKernel(): Kernel {
  const builder = new KernelBuilder();
  builder.registerVerb(boom, (_payload: void) => fail(new Error('kaboom')));
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
