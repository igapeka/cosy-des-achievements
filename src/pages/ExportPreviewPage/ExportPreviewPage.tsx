import { type CSSProperties } from "react";
import Sticker from "../../components/Sticker/Sticker";
import laptopStyles from "../LaptopPage/LaptopPage.module.css";
import type { LaptopSticker } from "../LaptopPage/LaptopPage";
import type { StickerPlacement } from "../LaptopPage/layout";
import styles from "./ExportPreviewPage.module.css";

type ExportPreviewPageProps = {
  stickers: LaptopSticker[];
  userLabel: string;
  seed: string;
  selectedStickers: StickerPlacement[];
};

const ExportPreviewPage = ({
  stickers,
  userLabel,
  seed,
  selectedStickers,
}: ExportPreviewPageProps) => {
  const stickersById = new Map(
    stickers.map((sticker) => [sticker.id, sticker]),
  );

  return (
    <main className={styles.content}>
      <div
        className={`${laptopStyles.imageArea} ${styles.imageArea}`}
        style={{ "--seed": seed } as CSSProperties}
      >
        <div className={laptopStyles.laptopWrapper}>
          <div className={laptopStyles.laptop}>
            {selectedStickers.map((placement) => {
              const sticker = stickersById.get(placement.id);
              if (!sticker) return null;
              return (
                <Sticker
                  key={placement.id}
                  src={sticker.src}
                  alt={sticker.alt}
                  className={laptopStyles.placedSticker}
                  style={
                    {
                      "--sticker-size": `${placement.size}px`,
                      "--sticker-x": `${placement.x}px`,
                      "--sticker-y": `${placement.y}px`,
                      "--sticker-rotation": `${placement.rotation}deg`,
                    } as CSSProperties
                  }
                />
              );
            })}
            <svg
              className={laptopStyles.logo}
              width="69"
              height="85"
              viewBox="0 0 69 85"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M66.8027 28.9734C64.032 30.6745 61.737 33.0526 60.1324 35.8853C58.5279 38.718 57.6663 41.9127 57.6282 45.1702C57.6391 48.8366 58.7224 52.4192 60.7437 55.4743C62.765 58.5294 65.6356 60.9228 69 62.3581C67.6735 66.6498 65.7104 70.7169 63.1766 74.4226C59.5511 79.6564 55.7601 84.8896 49.992 84.8896C44.2239 84.8896 42.7404 81.5291 36.0931 81.5291C29.6106 81.5291 27.3032 85 22.0293 85C16.7553 85 13.075 80.1519 8.84468 74.2023C3.25675 65.8676 0.18569 56.093 0 46.0514C0 29.5244 10.7128 20.7654 21.2601 20.7654C26.8638 20.7654 31.5335 24.456 35.0495 24.456C38.4005 24.456 43.6197 20.5446 49.992 20.5446C53.2684 20.4598 56.5154 21.1842 59.4469 22.6541C62.3783 24.1239 64.9044 26.2941 66.8027 28.9734ZM46.9707 13.5485C49.7798 10.2347 51.3699 6.05481 51.4755 1.70689C51.4803 1.13371 51.425 0.561609 51.3106 0C46.4854 0.472668 42.0234 2.7789 38.8399 6.44565C36.0038 9.62731 34.3537 13.6956 34.1702 17.9592C34.1723 18.4777 34.2276 18.9946 34.3351 19.5018C34.7155 19.5739 35.1017 19.6108 35.4888 19.6122C37.7126 19.4347 39.8772 18.8057 41.851 17.7633C43.8249 16.7209 45.5667 15.2869 46.9707 13.5485Z" />
            </svg>
          </div>
        </div>
        <p>DES Ачивки {userLabel}</p>
      </div>
      <small className={`${styles.hint} caption`}>
        Паршивый телеграм не даёт сохранять картинки, поэтому делай скрин
      </small>
    </main>
  );
};

export default ExportPreviewPage;
