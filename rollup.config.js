import typescript from '@rollup/plugin-typescript';
import typescriptEngine from 'typescript';
import dts from 'rollup-plugin-dts';
import pkg from './package.json' with { type: "json" };
export default [{
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      name: pkg.name,
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    typescript({
      typescript: typescriptEngine,

      exclude: [
        'coverage',
        '.storybook',
        'storybook-static',
        'config',
        'dist',
        'node_modules/**',
        '*.cjs',
        '*.mjs',
        '**/__snapshots__/*',
        '**/__tests__',
        '**/*.test.js+(|x)',
        '**/*.test.ts+(|x)',
        '**/*.mdx',
        '**/*.story.ts+(|x)',
        '**/*.story.js+(|x)',
        '**/*.stories.ts+(|x)',
        '**/*.stories.js+(|x)',
        'setupTests.ts',
        'vitest.config.ts',
      ],
    }),
  ],
}, {
  input: 'dist/types/src/index.d.ts',
  output: [{ file: 'dist/index.d.ts', format: 'esm' }],
  plugins: [dts()],
}];
