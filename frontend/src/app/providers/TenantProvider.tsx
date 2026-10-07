import { createContext, type PropsWithChildren } from "react";

type TenantContextValue = {
  slug: string;
};

export const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: PropsWithChildren) {
  return <TenantContext.Provider value={{ slug: "agricert-kenya" }}>{children}</TenantContext.Provider>;
}
