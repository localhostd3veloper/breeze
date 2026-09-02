import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'backend/',
    // Local Vercel build output. Gitignored, but eslint-config-next does not
    // ignore it, so a local `vercel build` otherwise fails every lint run on
    // thousands of findings in minified vendor bundles.
    '.vercel/**',
    // Vendored verbatim from the dataviz skill. Kept byte-identical to upstream
    // so it stays diffable; not ours to restyle.
    'scripts/validate_palette.js',
  ]),
]);

export default eslintConfig;
