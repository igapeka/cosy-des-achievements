import { type ReactNode } from "react";
import type { BootstrapResponse } from "../types/api";
import { BootstrapContext } from "./bootstrap-context";

export function BootstrapProvider({
  value,
  children,
}: {
  value: BootstrapResponse;
  children: ReactNode;
}) {
  return (
    <BootstrapContext.Provider value={value}>
      {children}
    </BootstrapContext.Provider>
  );
}
