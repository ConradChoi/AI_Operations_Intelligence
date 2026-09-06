import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // tests/idempotency.test.ts and tests/rls.test.ts both write to the SAME live hosted
    // Supabase project (project_id='demo-project'). idempotency.test.ts deletes and re-inserts
    // every demo transaction while rls.test.ts inserts and reads its own fixture rows there,
    // so running the files in parallel makes each one clobber the other's data.
    fileParallelism: false,
    // supabase/functions/**/*.test.ts are Deno tests (Deno.test + https: imports);
    // they are run separately via `deno test supabase/functions/run-spend-analysis/lib/`,
    // not by vitest. Without this exclude, vitest's default include glob picks them up
    // and they fail under Node's ESM loader (https: imports unsupported).
    exclude: [...configDefaults.exclude, 'supabase/functions/**'],
  },
});
