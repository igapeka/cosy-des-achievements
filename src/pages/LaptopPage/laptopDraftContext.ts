import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { StickerPlacement } from "./layout";

export type LaptopDraftValue = {
  seed: string;
  setSeed: Dispatch<SetStateAction<string>>;
  selectedStickers: StickerPlacement[];
  setSelectedStickers: Dispatch<SetStateAction<StickerPlacement[]>>;
  exportError: string | null;
  setExportError: Dispatch<SetStateAction<string | null>>;
};

export const LaptopDraftContext = createContext<LaptopDraftValue | null>(null);

export function useLaptopDraft() {
  const draft = useContext(LaptopDraftContext);
  if (!draft) throw new Error("LaptopDraftProvider is required.");
  return draft;
}
