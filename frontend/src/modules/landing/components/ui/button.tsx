import type { VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../../../shared/lib/cn";
import { buttonVariants } from "./buttonVariants";

type ButtonLinkProps = LinkProps & VariantProps<typeof buttonVariants>;

const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, ...props }, ref) => (
    <Link ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);

ButtonLink.displayName = "ButtonLink";

export { ButtonLink };
