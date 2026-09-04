import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { normalizeVendor } from './normalizeVendor.ts';

Deno.test('normalizeVendor - known alias maps to canonical name', () => {
  assertEquals(normalizeVendor('AWS Seoul'), 'AWS');
});

Deno.test('normalizeVendor - unknown vendor is title-cased', () => {
  assertEquals(normalizeVendor('acme cloud storage'), 'Acme Cloud Storage');
});

Deno.test('normalizeVendor - trims surrounding whitespace', () => {
  assertEquals(normalizeVendor('  Notion Labs  '), 'Notion');
});
