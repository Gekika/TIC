import { PortalCard } from "../ui/PortalCard";

export function PortalAccessSection() {
  return (
    <section id="portal" className="bg-primary-dark py-20 text-white sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 md:grid-cols-[0.9fr_1.1fr] md:items-center lg:px-10">
        <div>
          <h2 className="text-3xl font-bold tracking-normal sm:text-4xl">Dedicated Portal Access</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            Access your real-time reports, certification status, and inspection schedules through our secure platforms.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]">
          <PortalCard />
          <div
            aria-hidden="true"
            className="hidden rounded-lg border border-dashed border-white/15 bg-white/[0.035] sm:block"
          />
        </div>
      </div>
    </section>
  );
}
