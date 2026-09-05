import { describe, it, expect } from 'vitest';
import { formatKrw } from './format';

describe('formatKrw', () => {
  it('formats a whole number as KRW currency', () => {
    expect(formatKrw(1280000)).toBe('₩1,280,000');
  });

  it('rounds to the nearest won (no decimals)', () => {
    expect(formatKrw(1000.6)).toBe('₩1,001');
  });
});
