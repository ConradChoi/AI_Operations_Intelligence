import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // supabase/functions/**/*.test.ts are Deno tests (Deno.test + https: imports);
    // they are run separately via `deno test supabase/functions/run-spend-analysis/lib/`,
    // not by vitest. Without this exclude, vitest's default include glob picks them up
    // and they fail under Node's ESM loader (https: imports unsupported).
    exclude: [...configDefaults.exclude, 'supabase/functions/**'],
  },
});
