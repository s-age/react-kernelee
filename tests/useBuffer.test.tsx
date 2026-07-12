import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { BufferBuilder, defineState, KernelBuilder, type Kernel } from '@s-age/kernelee';
import { KernelProvider, useBuffer } from '../src/index.js';

const CounterState = defineState('react-kernelee.useBuffer.Counter', { n: 0 });

function buildKernel(): Kernel {
  const bufferBuilder = new BufferBuilder();
  bufferBuilder.allocate(CounterState);
  return new KernelBuilder().build({ buffer: bufferBuilder });
}

function Counter() {
  const { n } = useBuffer(CounterState);
  return <span data-testid="counter">{n}</span>;
}

test('useBufferRerendersOnMutateAndReadsTheNewValue', () => {
  const kernel = buildKernel();
  render(
    <KernelProvider kernel={kernel}>
      <Counter />
    </KernelProvider>,
  );
  expect(screen.getByTestId('counter').textContent).toBe('0');

  act(() => {
    kernel.buffer.mutate(CounterState, (c) => ({ n: c.n + 1 }));
  });

  expect(screen.getByTestId('counter').textContent).toBe('1');
});

test('twoComponentsSubscribedToTheSameKeyBothUpdateFromOneMutate', () => {
  const kernel = buildKernel();
  render(
    <KernelProvider kernel={kernel}>
      <Counter />
      <Counter />
    </KernelProvider>,
  );
  expect(screen.getAllByTestId('counter').map((el) => el.textContent)).toEqual(['0', '0']);

  act(() => {
    kernel.buffer.mutate(CounterState, (c) => ({ n: c.n + 1 }));
  });

  expect(screen.getAllByTestId('counter').map((el) => el.textContent)).toEqual(['1', '1']);
});

test('unmountingUnsubscribesTheListenerFromTheBuffer', () => {
  const kernel = buildKernel();
  // Wrap the real Buffer.subscribe (not a stub) so mutate still exercises the
  // genuine notification path — we only tap in to count how many times the
  // listener useBuffer registered actually fires.
  const originalSubscribe = kernel.buffer.subscribe.bind(kernel.buffer);
  let notifications = 0;
  const subscribeSpy = vi
    .spyOn(kernel.buffer, 'subscribe')
    .mockImplementation((key, listener) =>
      originalSubscribe(key, () => {
        notifications += 1;
        listener();
      }),
    );

  const { unmount } = render(
    <KernelProvider kernel={kernel}>
      <Counter />
    </KernelProvider>,
  );
  expect(subscribeSpy).toHaveBeenCalledTimes(1);

  act(() => {
    kernel.buffer.mutate(CounterState, (c) => ({ n: c.n + 1 }));
  });
  expect(notifications).toBe(1);

  unmount();

  // Post-unmount mutate must not reach the wrapped listener — proof that
  // useBuffer's useSyncExternalStore effect cleanup actually called the
  // unsubscribe function Buffer.subscribe returned.
  kernel.buffer.mutate(CounterState, (c) => ({ n: c.n + 1 }));
  expect(notifications).toBe(1);
});
