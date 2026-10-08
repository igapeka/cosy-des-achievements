import {
  useCallback,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { LaptopDraftContext } from "./laptopDraftContext";
import type { StickerPlacement } from "./layout";

type LaptopDraftProviderProps = {
  ownerId: string | null;
  ownedStickerIds: string[];
  children: ReactNode;
};

type LaptopDraftState = {
  ownerId: string | null;
  seed: string;
  selectedStickers: StickerPlacement[];
};

export function LaptopDraftProvider({
  ownerId,
  ownedStickerIds,
  children,
}: LaptopDraftProviderProps) {
  const [draft, setDraft] = useState<LaptopDraftState>({
    ownerId,
    seed: "#000000",
    selectedStickers: [],
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const ownedIdsKey = ownedStickerIds.join("\u0000");
  const [syncedCatalog, setSyncedCatalog] = useState({ ownerId, ownedIdsKey });

  if (syncedCatalog.ownerId !== ownerId || syncedCatalog.ownedIdsKey !== ownedIdsKey) {
    setSyncedCatalog({ ownerId, ownedIdsKey });
    setDraft((current) => {
      if (current.ownerId !== ownerId || ownerId === null) {
        return { ownerId, seed: "#000000", selectedStickers: [] };
      }
      const ownedIds = new Set(ownedIdsKey ? ownedIdsKey.split("\u0000") : []);
      const selectedStickers = current.selectedStickers.filter((sticker) =>
        ownedIds.has(sticker.id),
      );
      return selectedStickers.length === current.selectedStickers.length
        ? current
        : { ...current, selectedStickers };
    });
  }

  const setSeed = useCallback<Dispatch<SetStateAction<string>>>((action) => {
    setDraft((current) => ({
      ...current,
      seed: typeof action === "function" ? action(current.seed) : action,
    }));
  }, []);

  const setSelectedStickers = useCallback<
    Dispatch<SetStateAction<StickerPlacement[]>>
  >((action) => {
    setDraft((current) => ({
      ...current,
      selectedStickers:
        typeof action === "function"
          ? action(current.selectedStickers)
          : action,
    }));
  }, []);

  return (
    <LaptopDraftContext.Provider
      value={{
        seed: draft.seed,
        setSeed,
        selectedStickers: draft.selectedStickers,
        setSelectedStickers,
        exportError,
        setExportError,
      }}
    >
      {children}
    </LaptopDraftContext.Provider>
  );
}
