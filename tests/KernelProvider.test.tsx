import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { BufferBuilder, KernelBuilder } from '@s-age/kernelee';
import { KernelProvider, useKernel } from '../src/index.js';

test('kernelProviderRendersItsChildren', () => {
  const kernel = new KernelBuilder().build({ buffer: new BufferBuilder() });
  render(
    <KernelProvider kernel={kernel}>
      <span data-testid="child">hello</span>
    </KernelProvider>,
  );
  expect(screen.getByTestId('child').textContent).toBe('hello');
});

test('aNestedProviderShadowsTheOuterKernelForItsDescendants', () => {
  const outer = new KernelBuilder().build({ buffer: new BufferBuilder() });
  const inner = new KernelBuilder().build({ buffer: new BufferBuilder() });
  let observedByChild: unknown;

  function Child() {
    observedByChild = useKernel();
    return null;
  }

  render(
    <KernelProvider kernel={outer}>
      <KernelProvider kernel={inner}>
        <Child />
      </KernelProvider>
    </KernelProvider>,
  );

  expect(observedByChild).toBe(inner);
  expect(observedByChild).not.toBe(outer);
});
