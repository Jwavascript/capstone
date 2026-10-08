// 테스트마다 시각을 2026-10-07 12:00 KST로 고정하고 샘플(폴더 · 북마크)을 되돌림
import { afterEach, beforeEach, vi } from 'vitest';
import { resetSample } from '../server/sample';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime('2026-10-07T12:00:00+09:00');
  resetSample();
});

afterEach(() => {
  vi.useRealTimers();
});
