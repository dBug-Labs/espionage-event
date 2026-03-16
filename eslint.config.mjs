import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
]);
