/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// `test` is typed by vitest/config's defineConfig; vite's own defineConfig does
// not know the key, which trips `tsc --noEmit` under strict mode.
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true },
});
