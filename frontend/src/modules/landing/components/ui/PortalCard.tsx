import { LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { ButtonLink } from "./button";

export function PortalCard() {
  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="rounded-lg border border-white/10 bg-white/[0.09] p-6 text-white shadow-2xl shadow-black/20"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white">
        <LayoutGrid aria-hidden="true" className="h-5 w-5" />
      </div>
      <h3 className="mt-9 text-xl font-semibold">Client Portal</h3>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        Manage certifications and view live inspection updates for your shipments.
      </p>
      <ButtonLink to="/login" className="mt-8 w-full" size="sm" aria-label="Log into Client Portal">
        Log into Client Portal
      </ButtonLink>
    </motion.article>
  );
}
