import type { HTMLAttributes } from "react";
import iconImage from "../../assets/icons/icon-image.svg";
import iconExpand from "../../assets/icons/icon-expand.svg";
import iconSave from "../../assets/icons/icon-save.svg";
import iconShuffle from "../../assets/icons/icon-shuffle.svg";
import styles from "./Icon.module.css";

const iconAssets = {
  "icon-image.svg": iconImage,
  "icon-expand.svg": iconExpand,
  "icon-shuffle.svg": iconShuffle,
  "icon-save.svg": iconSave,
} as const;

export type IconName = keyof typeof iconAssets;

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, "title"> & {
  name: IconName;
  title?: string;
};

const Icon = ({ name, title, className, style, ...spanProps }: IconProps) => {
  const maskImage = `url("${iconAssets[name]}")`;
  const iconClassName = [styles.icon, className].filter(Boolean).join(" ");

  return (
    <span
      {...spanProps}
      className={iconClassName}
      style={{ maskImage, WebkitMaskImage: maskImage, ...style }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
    />
  );
};

export default Icon;
