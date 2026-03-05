type DevFlagHost = {
  __DEV__?: boolean;
};

const devFlagHost = globalThis as typeof globalThis & DevFlagHost;

if (devFlagHost.__DEV__ === undefined) {
  devFlagHost.__DEV__ = false;
}

const originalConsoleError = console.error.bind(console);

console.error = (...args: unknown[]) => {
  const [firstArg] = args;
  const message = typeof firstArg === "string" ? firstArg : "";

  if (message.includes("react-test-renderer is deprecated")) {
    return;
  }

  originalConsoleError(...args);
};

export {};
