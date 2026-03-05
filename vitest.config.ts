import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "react-native": new URL("./test/mocks/react-native.ts", import.meta.url).pathname,
      "react-native-url-polyfill/auto": new URL(
        "./test/mocks/react-native-url-polyfill-auto.ts",
        import.meta.url,
      ).pathname,
      "expo-sqlite/localStorage/install": new URL(
        "./test/mocks/expo-sqlite-localstorage-install.ts",
        import.meta.url,
      ).pathname,
    },
  },
});
