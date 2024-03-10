import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	outDir: "package/syren",
	format: "esm",
	dts: true,
	clean: true,
	sourcemap: true,
	minify: "terser",
	external: ['@nagisham/standard', '@nagisham/eventable']
});
