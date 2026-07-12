import { render } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { BufferBuilder, KernelBuilder } from '@s-age/kernelee';
import { KernelProvider, useKernel } from '../src/index.js';

function Probe() {
  const kernel = useKernel();
  return <span data-testid="probe">{typeof kernel}</span>;
}

test('useKernelThrowsAClearErrorOutsideAProvider', () => {
  // React logs render errors to console.error even when the test catches
  // them — silence that expected noise for this one assertion.
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(() => render(<Probe />)).toThrowError(/KernelProvider/);
  } finally {
    consoleError.mockRestore();
  }
});

test('useKernelReturnsTheExactKernelInstanceInjectedByTheProvider', () => {
  const kernel = new KernelBuilder().build({ buffer: new BufferBuilder() });
  let observed: unknown;

  function Capture() {
    observed = useKernel();
    return null;
  }

  render(
    <KernelProvider kernel={kernel}>
      <Capture />
    </KernelProvider>,
  );

  expect(observed).toBe(kernel);
});
