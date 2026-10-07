import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-green disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary-green text-white hover:bg-[#18583f]",
        outline: "border border-white/75 bg-white/5 text-white hover:bg-white hover:text-primary-dark",
        ghost: "border border-white/10 bg-white/10 text-white hover:bg-white/15",
        dark: "bg-primary-dark text-white hover:bg-accent-teal"
      },
      size: {
        default: "h-12 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
