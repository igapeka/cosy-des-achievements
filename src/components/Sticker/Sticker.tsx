import styles from "./Sticker.module.css";
import type { CSSProperties } from "react";

type StickerProps = {
  src: string;
  alt: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
};

const Sticker = ({
  src,
  alt,
  className,
  disabled = false,
  onClick,
  style,
}: StickerProps) => {
  return (
    <figure
      className={className}
      onClick={onClick}
      style={style}
    >
      <img
        src={src}
        crossOrigin="anonymous"
        alt={alt}
        className={
          disabled ? `${styles.sticker} ${styles.disabled}` : styles.sticker
        }
      />
    </figure>
  );
};

export default Sticker;
