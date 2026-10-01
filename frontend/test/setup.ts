import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { resetNavigation } from './navigation';
import { server } from './server';

vi.mock('next/navigation', () => import('./navigation'));
vi.mock('next/link', () => import('./link'));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetNavigation();
  sessionStorage.clear();
});
afterAll(() => server.close());
