import type { ReactNode } from "react";

/**
 * Root layout minimal. El layout con <html>, <body>, fuentes y providers
 * vive en [locale]/layout.tsx, que actúa como raíz gracias al middleware.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
