import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import {
  actionsOf,
  BufferBuilder,
  defineCallable,
  defineState,
  KernelBuilder,
  portK,
  symbol,
  type Kernel,
} from '@s-age/kernelee';
import { KernelProvider, useBuffer, useDispatch } from '../src/index.js';
import { until } from './support.js';

const CounterState = defineState('react-kernelee.useDispatch.Counter', { n: 0 });
const increment = symbol<void, void>('react-kernelee.useDispatch.increment');

function buildKernel(): Kernel {
  const builder = new KernelBuilder();
  builder.register(increment, (kernel: Kernel, _payload: void) => {
    kernel.buffer.mutate(CounterState, (c: { n: number }) => ({ n: c.n + 1 }));
  });
  const bufferBuilder = new BufferBuilder();
  bufferBuilder.allocate(CounterState);
  return builder.build({ buffer: bufferBuilder });
}

function Counter() {
  const { n } = useBuffer(CounterState);
  const dispatchIncrement = useDispatch(increment);
  return (
    <button data-testid="btn" onClick={dispatchIncrement}>
      {n}
    </button>
  );
}

test('clickingCallsDispatchWhichRunsTheHandlerOnTheKernel', async () => {
  const kernel = buildKernel();
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

test('theReturnedDispatcherIsReferentiallyStableAcrossRerenders', () => {
  const kernel = buildKernel();
  const captured: Array<() => void> = [];

  function Probe() {
    const [, setTick] = useState(0);
    const dispatchIncrement = useDispatch(increment);
    captured.push(dispatchIncrement);
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

// MARK: - useDispatch() — the no-symbol (Redux-shaped) overload

const CounterPort = defineCallable('react-kernelee.useDispatch.CounterPort', {
  add: portK<number, void>('add n to the counter'),
  reset: portK<void, void>('reset n to 0'),
});
const CounterActions = actionsOf(CounterPort);

function buildCounterKernel(): Kernel {
  const builder = new KernelBuilder();
  CounterPort.wire(
    {
      add: (kernel: Kernel, n: number) => {
        kernel.buffer.mutate(CounterState, (c: { n: number }) => ({ n: c.n + n }));
      },
      reset: (kernel: Kernel) => {
        kernel.buffer.mutate(CounterState, () => ({ n: 0 }));
      },
    },
    builder,
  );
  const bufferBuilder = new BufferBuilder();
  bufferBuilder.allocate(CounterState);
  return builder.build({ buffer: bufferBuilder });
}

test('dispatchingActionsBuiltByActionCreatorsRunsTheirHandlers', async () => {
  const kernel = buildCounterKernel();

  function ActionCounter() {
    const { n } = useBuffer(CounterState);
    const dispatch = useDispatch(); // one generic dispatcher for the whole component
    return (
      <div>
        <button data-testid="add" onClick={() => dispatch(CounterActions.add(5))}>
          {n}
        </button>
        <button data-testid="reset" onClick={() => dispatch(CounterActions.reset())} />
      </div>
    );
  }

  render(
    <KernelProvider kernel={kernel}>
      <ActionCounter />
    </KernelProvider>,
  );

  fireEvent.click(screen.getByTestId('add'));
  await until(() => kernel.buffer.read(CounterState).n === 5);
  await waitFor(() => {
    expect(screen.getByTestId('add').textContent).toBe('5');
  });

  fireEvent.click(screen.getByTestId('reset')); // void-payload creator: no argument
  await until(() => kernel.buffer.read(CounterState).n === 0);
});

test('theGenericDispatcherIsReferentiallyStableAcrossRerenders', () => {
  const kernel = buildCounterKernel();
  const captured: Array<unknown> = [];

  function Probe() {
    const [, setTick] = useState(0);
    captured.push(useDispatch());
    return <button data-testid="tick2" onClick={() => setTick((t) => t + 1)} />;
  }

  render(
    <KernelProvider kernel={kernel}>
      <Probe />
    </KernelProvider>,
  );
  expect(captured).toHaveLength(1);

  fireEvent.click(screen.getByTestId('tick2'));
  expect(captured).toHaveLength(2);
  expect(captured[1]).toBe(captured[0]);
});
