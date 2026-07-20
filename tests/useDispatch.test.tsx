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
import { KernelProvider, useBuffer, useDispatch, useTrigger } from '../src/index.js';
import { until } from './support.js';

const CounterState = defineState('react-kernelee.useDispatch.Counter', { n: 0 });

// MARK: - Type-level assertions for the void-payload exclusion
//
// `useDispatch`'s symbol-form overload rejects `void`-payload symbols at
// compile time (`NoVoidPayload`); `useTrigger` is their sole binding form.
// This function is never called — it exists only for `tsc --noEmit` (which
// includes `tests/` per tsconfig) to check the `@ts-expect-error` markers
// and the still-legal non-void form.
function typeAssertions(): void {
  const voidSym = symbol<void, void>('react-kernelee.useDispatch.typeAssertions.void');
  const numSym = symbol<number, void>('react-kernelee.useDispatch.typeAssertions.num');

  // @ts-expect-error — void-payload symbols are rejected by useDispatch's symbol form; use useTrigger.
  useDispatch(voidSym);

  // @ts-expect-error — useTrigger only binds void-payload symbols.
  useTrigger(numSym);

  // Regression check: a non-void symbol still binds normally through useDispatch.
  const dispatchNum: (payload: number) => void = useDispatch(numSym);
  void dispatchNum;
}
void typeAssertions;

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
