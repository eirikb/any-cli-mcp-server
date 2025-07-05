import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: false,
  sourcemap: true,
  target: 'es2022',
  platform: 'node',
  bundle: true,
  splitting: false,
  treeshake: true,
  keepNames: true,
  cjsInterop: true,
  outExtension(ctx) {
    return {
      js: ctx.format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});
