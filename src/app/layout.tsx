import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CollectionProvider } from "@/lib/collection-context";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "PaintMatcher",
  description: "Photograph your miniature paints, catalog them, and explore them on a colour map.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CollectionProvider>
          <Nav />
          {children}
        </CollectionProvider>
      </body>
    </html>
  );
}
