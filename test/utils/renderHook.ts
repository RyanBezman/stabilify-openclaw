import React from "react";
import TestRenderer, { act } from "react-test-renderer";

type RenderedHook<TResult, TProps> = {
  result: {
    readonly current: TResult;
  };
  rerender: (nextProps: TProps) => void;
  unmount: () => void;
};

export function renderTestHook<TResult>(
  callback: () => TResult,
): RenderedHook<TResult, void>;
export function renderTestHook<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options: { initialProps: TProps },
): RenderedHook<TResult, TProps>;
export function renderTestHook<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options?: { initialProps: TProps },
): RenderedHook<TResult, TProps> {
  let currentResult = {} as TResult;
  let hasResult = false;

  function HookHarness({ hookProps }: { hookProps: TProps }) {
    currentResult = callback(hookProps);
    hasResult = true;
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(HookHarness, { hookProps: options?.initialProps as TProps }),
    );
  });

  return {
    result: {
      get current() {
        if (!hasResult) {
          throw new Error("Hook result not available yet.");
        }
        return currentResult;
      },
    },
    rerender: (nextProps: TProps) => {
      if (!renderer) {
        throw new Error("Hook renderer is not available.");
      }
      act(() => {
        renderer?.update(React.createElement(HookHarness, { hookProps: nextProps }));
      });
    },
    unmount: () => {
      if (!renderer) {
        return;
      }
      act(() => {
        renderer?.unmount();
      });
      renderer = null;
    },
  };
}
