import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted">This page does not exist or you do not have access to it.</p>
        <Link href="/" className={`${btn.primary} mt-6`}>Go to my home page</Link>
      </div>
    </main>
  );
}
