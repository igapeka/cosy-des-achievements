import Sticker from "../Sticker/Sticker";
import styles from "./CollectionFolder.module.css";
import type { KeyboardEvent } from "react";

type FolderSticker = {
  id: string;
  src: string;
  alt: string;
};

type CollectionFolderProps = {
  title: string;
  stickers: FolderSticker[];
  onOpen: () => void;
};

const CollectionFolder = ({ title, stickers, onOpen }: CollectionFolderProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      className={styles.folder}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <p className="bold">{title}</p>
      <div className={styles.stickers}>
        {stickers.slice(0, 3).map((sticker) => (
          <Sticker key={sticker.id} src={sticker.src} alt={sticker.alt} />
        ))}
      </div>
    </div>
  );
};

export default CollectionFolder;
