import type { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-tic-green text-white hover:bg-[#18583f]",
        variant === "secondary" && "border border-slate-200 bg-white text-tic-navy hover:bg-slate-50",
        variant === "ghost" && "text-tic-muted hover:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}
