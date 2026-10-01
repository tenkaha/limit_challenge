import { useSyncExternalStore } from 'react';

// In-memory stand-in for next/navigation: a URL store that components subscribe
// to, so router.replace() re-renders exactly like the real App Router would.
let url = new URL('http://localhost/vehicles');
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const navigate = (href: string) => {
  url = new URL(href, url);
  listeners.forEach((listener) => listener());
};

export const currentUrl = () => `${url.pathname}${url.search}`;
export const setUrl = (href: string) => navigate(href);
export const resetNavigation = () => navigate('http://localhost/vehicles');

const router = { push: navigate, replace: navigate, back: () => {}, prefetch: () => {} };

export const useRouter = () => router;
export const usePathname = () => useSyncExternalStore(subscribe, () => url.pathname);
export const useSearchParams = () =>
  new URLSearchParams(useSyncExternalStore(subscribe, () => url.search));
export const useParams = () => ({});
export const redirect = navigate;
