import { CheckCircle2 } from "lucide-react";

type StatItemProps = {
  children: string;
};

export function StatItem({ children }: StatItemProps) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-slate-700">
      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary-green" />
      <span>{children}</span>
    </li>
  );
}
