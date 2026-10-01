import type { AnchorHTMLAttributes } from 'react';

// next/link needs a mounted App Router; a plain anchor is enough for these tests.
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
