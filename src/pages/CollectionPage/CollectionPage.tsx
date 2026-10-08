import Sticker from "../../components/Sticker/Sticker";
import styles from "./CollectionPage.module.css";

type CollectionSticker = {
  id: string;
  src: string;
  alt: string;
  disabled?: boolean;
};

type CollectionPageProps = {
  title: string;
  description: string;
  stickers: CollectionSticker[];
  onOpenSticker: (stickerId: string) => void;
};

const CollectionPage = ({
  title,
  description,
  stickers,
  onOpenSticker,
}: CollectionPageProps) => {
  return (
    <>
      <div className={styles.content}>
        <h1 className={styles.heading}>{title}</h1>
        <p className={styles.descrition}>{description}</p>
        <div className={styles.grid}>
          {stickers.map((sticker) => (
            <Sticker
              key={sticker.id}
              src={sticker.src}
              alt={sticker.alt}
              disabled={sticker.disabled}
              onClick={() => onOpenSticker(sticker.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default CollectionPage;
