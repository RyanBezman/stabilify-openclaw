type DevFlagHost = {
  __DEV__?: boolean;
};

const devFlagHost = globalThis as typeof globalThis & DevFlagHost;

if (devFlagHost.__DEV__ === undefined) {
  devFlagHost.__DEV__ = false;
}

export {};
