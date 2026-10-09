import styles from "./ErrorPage.module.css";

type ErrorPageProps = {
  message: string;
  emoji?: string;
};

const ErrorPage = ({ message, emoji = "🤷" }: ErrorPageProps) => {
  return (
    <>
      <div className={styles.content}>
        <span className={styles.emoji}>{emoji}</span>
        <p className={styles.text}>{message}</p>
      </div>
    </>
  );
};

export default ErrorPage;
