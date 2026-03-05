export const Alert = {
  alert: () => {},
};

export const Platform = {
  OS: "ios",
  Version: "18.0",
};

export const NativeModules = {};

class AnimatedValue {
  private value: number;

  constructor(initialValue: number) {
    this.value = initialValue;
  }

  setValue(nextValue: number) {
    this.value = nextValue;
  }
}

export const Animated = {
  Value: AnimatedValue,
  timing: () => ({
    start: (callback?: () => void) => {
      callback?.();
    },
  }),
};
