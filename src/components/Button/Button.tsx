import { type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  size?: "square" | "full";
  variant?: "default" | "primary";
};

const Button = ({
  children,
  className,
  icon,
  size,
  type = "button",
  variant = "default",
  ...buttonProps
}: ButtonProps) => {
  const resolvedSize = size ?? (icon && children == null ? "square" : "full");
  const buttonClassName = [
    styles.button,
    styles[variant],
    styles[resolvedSize],
    "body",
    "bold",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      type={type}
      className={buttonClassName}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
};

export default Button;
