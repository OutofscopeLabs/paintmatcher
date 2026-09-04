"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCollection } from "@/lib/collection-context";

const LINKS = [["/", "Scan"], ["/collection", "Collection"], ["/map", "Map"], ["/catalog", "Encyclopedia"]] as const;

export function Nav() {
  const path = usePathname();
  const { collection, ready } = useCollection();
  const pots = collection.owned.reduce((n, o) => n + o.qty, 0);
  return (
    <nav className="nav">
      <Link href="/" className="brand">PaintMatcher</Link>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={`link${path === href ? " active" : ""}`}>{label}</Link>
      ))}
      <span className="spacer" />
      <span className="count">{ready ? `${collection.owned.length} paints · ${pots} pots` : ""}</span>
    </nav>
  );
}
