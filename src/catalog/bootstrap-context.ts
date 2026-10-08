import { createContext, useContext } from "react";
import type { BootstrapResponse } from "../types/api";

export const BootstrapContext = createContext<BootstrapResponse | null>(null);

export function useBootstrapCatalog() {
  const bootstrap = useContext(BootstrapContext);
  if (!bootstrap) throw new Error("BootstrapProvider is required.");
  return bootstrap;
}
