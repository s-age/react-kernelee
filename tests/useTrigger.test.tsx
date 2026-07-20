import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { BufferBuilder, defineCallable, defineState, KernelBuilder, portK, type Kernel } from '@s-age/kernelee';
import { KernelProvider, useBuffer, useTrigger } from '../src/index.js';
import { until } from './support.js';

const CounterState = defineState('react-kernelee.useTrigger.Counter', { n: 0 });
// `KernelBuilder.register` is @internal (kernelee's own tests / `Callable.wire`
// only) — bind through `defineCallable`/`portK`/`wire`, the public idiom
// already used for the no-symbol overload's tests in `useDispatch.test.tsx`.
const TriggerPort = defineCallable('react-kernelee.useTrigger.TriggerPort', {
  increment: portK<void, void>('increment n'),
});

function buildKernel(seen: unknown[]): Kernel {
  const builder = new KernelBuilder();
  TriggerPort.wire(
    {
      increment: (kernel: Kernel, payload: void) => {
        seen.push(payload);
        kernel.buffer.mutate(CounterState, (c: { n: number }) => ({ n: c.n + 1 }));
      },
    },
    builder,
  );
  const bufferBuilder = new BufferBuilder();
  bufferBuilder.allocate(CounterState);
  return builder.build({ buffer: bufferBuilder });
}

function Counter() {
  const { n } = useBuffer(CounterState);
  const triggerIncrement = useTrigger(TriggerPort.increment);
  return (
    <button data-testid="btn" onClick={triggerIncrement}>
      {n}
    </button>
  );
}

test('theHandlerReceivesUndefinedNotTheSyntheticEvent', async () => {
  // Regression test for the SyntheticEvent leak: `onClick={dispatcher}` hands
  // the click's SyntheticEvent to the dispatcher as its first argument.
  // `useTrigger`'s returned closure declares no parameter and forwards
  // nothing, so the handler must observe `undefined`, never the event.
  const seen: unknown[] = [];
  const kernel = buildKernel(seen);
  render(
    <KernelProvider kernel={kernel}>
      <Counter />
    </KernelProvider>,
  );

  fireEvent.click(screen.getByTestId('btn'));

  await until(() => seen.length === 1);
  expect(seen[0]).toBeUndefined();
});

test('clickingCallsTriggerWhichRunsTheHandlerOnTheKernel', async () => {
  const kernel = buildKernel([]);
  render(
    <KernelProvider kernel={kernel}>
      <Counter />
    </KernelProvider>,
  );

  fireEvent.click(screen.getByTestId('btn'));

  // dispatch runs on the serial CommandBus, off the click's own call stack —
  // poll the kernel-side effect first (kernelee idiom), then the DOM.
  await until(() => kernel.buffer.read(CounterState).n === 1);
  await waitFor(() => {
    expect(screen.getByTestId('btn').textContent).toBe('1');
  });
});

test('theReturnedTriggerIsReferentiallyStableAcrossRerenders', () => {
  const kernel = buildKernel([]);
  const captured: Array<() => void> = [];

  function Probe() {
    const [, setTick] = useState(0);
    const triggerIncrement = useTrigger(TriggerPort.increment);
    captured.push(triggerIncrement);
    return <button data-testid="tick" onClick={() => setTick((t) => t + 1)} />;
  }

  render(
    <KernelProvider kernel={kernel}>
      <Probe />
    </KernelProvider>,
  );
  expect(captured).toHaveLength(1);

  fireEvent.click(screen.getByTestId('tick')); // forces a rerender unrelated to the kernel/symbol
  expect(captured).toHaveLength(2);
  expect(captured[1]).toBe(captured[0]);
});
