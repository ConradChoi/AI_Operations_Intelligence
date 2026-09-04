import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { categorize } from './categorize.ts';

Deno.test('categorize - known vendor maps to category', () => {
  assertEquals(categorize('AWS'), 'Cloud Infrastructure');
});

Deno.test('categorize - unknown vendor falls back to Uncategorized', () => {
  assertEquals(categorize('Random Vendor'), 'Uncategorized');
});
