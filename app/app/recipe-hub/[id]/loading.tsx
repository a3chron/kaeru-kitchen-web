import Header from "@/components/header";

// Streamed while the server component awaits Supabase — without this, a slow
// connection (exactly the shared-link-on-mobile case) stares at a blank tab.
export default function Loading() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-4 md:p-6" aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-ctp-mantle border border-ctp-surface0 rounded-lg" />
          <div className="h-96 bg-ctp-mantle border border-ctp-surface0 rounded-xl" />
        </div>
        <p className="sr-only">Loading recipe…</p>
      </main>
    </>
  );
}
