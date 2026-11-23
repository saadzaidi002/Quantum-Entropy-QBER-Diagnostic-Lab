import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

/** Rename dist/index.html to dist/quantum-lab.html after the single-file build. */
function renameOutput(): Plugin {
  return {
    name: "rename-output",
    apply: "build",
    closeBundle() {
      const from = resolve(__dirname, "dist/index.html");
      if (existsSync(from)) renameSync(from, resolve(__dirname, "dist/quantum-lab.html"));
    },
  };
}

/** In the built file only: a Content-Security-Policy that forbids every network request. */
function offlineCsp(): Plugin {
  const csp =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  return {
    name: "offline-csp",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), offlineCsp(), viteSingleFile(), renameOutput()],
  build: { target: "es2020", reportCompressedSize: false, modulePreload: { polyfill: false } },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});
