import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type ServiceCardProps = {
  description: string;
  href: string;
  icon: LucideIcon;
  index: number;
  linkText: string;
  title: string;
};

export function ServiceCard({ description, href, icon: Icon, index, linkText, title }: ServiceCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ delay: index * 0.15, duration: 0.5, ease: "easeOut" }}
      className="group rounded-lg border border-divider bg-white p-6 shadow-soft-card transition hover:-translate-y-1 hover:border-primary-green/40"
    >
      <div className="mb-9 flex h-10 w-10 items-center justify-center rounded-md border border-primary-green/20 bg-primary-green/10 text-primary-green">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.1} />
      </div>
      <h3 className="text-lg font-semibold text-primary-dark">{title}</h3>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
      <a
        href={href}
        className="mt-6 inline-flex text-sm font-semibold text-primary-green underline decoration-primary-green/30 underline-offset-4 transition hover:decoration-primary-green"
      >
        {linkText}
      </a>
    </motion.article>
  );
}
