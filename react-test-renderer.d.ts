declare module "react-test-renderer" {
  import * as React from "react";

  type TestProps = {
    testID?: string;
    onPress?: () => void;
    [key: string]: string | number | boolean | null | undefined | (() => void);
  };

  export interface ReactTestInstance {
    props: TestProps;
    children: Array<string | number>;
    findAllByType(type: string): ReactTestInstance[];
    findByProps(props: TestProps): ReactTestInstance;
  }

  type ReactTestRendererJSON =
    | string
    | number
    | boolean
    | null
    | { type: string; props: TestProps; children: ReactTestRendererJSON[] | null }
    | ReactTestRendererJSON[];

  namespace TestRenderer {
    interface ReactTestRenderer {
      unmount(): void;
      update(nextElement: React.ReactElement): void;
      toJSON(): ReactTestRendererJSON;
      readonly root: ReactTestInstance;
    }
  }

  type ActCallback = () => void | Promise<void>;

  export function act(callback: ActCallback): Promise<void>;

  const TestRenderer: {
    create(nextElement: React.ReactElement): TestRenderer.ReactTestRenderer;
  };

  export default TestRenderer;
}
