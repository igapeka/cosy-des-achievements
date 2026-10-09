import Sticker from "../../components/Sticker/Sticker";
import styles from "./AchievementPage.module.css";
import { useRef, type PointerEvent } from "react";

type AchievementPageProps = {
  src: string;
  alt: string;
  description: string;
  awardedAt: string | null;
  disabled?: boolean;
};

const formatAwardedAt = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const AchievementPage = ({
  src,
  alt,
  description,
  awardedAt,
  disabled = false,
}: AchievementPageProps) => {
  const awardedAtLabel = disabled ? null : formatAwardedAt(awardedAt);
  const dragStart = useRef<{
    x: number;
    y: number;
    rotateX: number;
    rotateY: number;
  } | null>(null);
  const rotation = useRef({ x: 0, y: 0 });

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      rotateX: rotation.current.x,
      rotateY: rotation.current.y,
    };
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;

    if (event.pointerType === "mouse") {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        handlePointerUp(event);
        return;
      }
    }

    const rotateX = Math.max(
      -12,
      Math.min(12, start.rotateX + (start.y - event.clientY) * 0.12),
    );
    const rotateY = Math.max(
      -12,
      Math.min(12, start.rotateY + (event.clientX - start.x) * 0.12),
    );
    rotation.current = { x: rotateX, y: rotateY };
    event.currentTarget.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = null;
    rotation.current = { x: 0, y: 0 };
    event.currentTarget.dataset.dragging = "false";
    event.currentTarget.style.transform =
      "perspective(800px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <>
      <div className={styles.content}>
        <div
          className={disabled ? `${styles.display} ${styles.disabled}` : styles.display}
          onPointerDown={disabled ? undefined : handlePointerDown}
          onPointerMove={disabled ? undefined : handlePointerMove}
          onPointerUp={disabled ? undefined : handlePointerUp}
          onPointerCancel={disabled ? undefined : handlePointerUp}
          onPointerLeave={disabled ? undefined : (event) => {
            if (event.pointerType === "mouse") handlePointerUp(event);
          }}
        >
          <Sticker src={src} alt={alt} disabled={disabled} />
        </div>
        <div>
          <p>{description}</p>
          {awardedAtLabel && <small className="caption">{awardedAtLabel}</small>}
        </div>
        {!disabled && <Sticker src={src} alt={alt} className={styles.bg} />}
      </div>
    </>
  );
};

export default AchievementPage;
