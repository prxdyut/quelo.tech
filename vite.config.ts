import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [devtoolsJson(), reactRouter(), tsconfigPaths()],
  resolve: {
    alias: {
      "roughjs/bin/rough": "roughjs/bin/rough.js",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  build: {
    target: "es2022",
  },
  json: {
    namedExports: true,
  },
});
