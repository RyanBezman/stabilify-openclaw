type DevFlagHost = {
  __DEV__?: boolean;
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const devFlagHost = globalThis as typeof globalThis & DevFlagHost;

if (devFlagHost.__DEV__ === undefined) {
  devFlagHost.__DEV__ = false;
}

if (devFlagHost.IS_REACT_ACT_ENVIRONMENT === undefined) {
  devFlagHost.IS_REACT_ACT_ENVIRONMENT = true;
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
