import styles from "./ErrorPage.module.css";

type ErrorPageProps = {
  message: string;
};

const ErrorPage = ({ message }: ErrorPageProps) => {
  return (
    <>
      <div className={styles.content}>
        <span className={styles.emoji}>🤷</span>
        <p className={styles.text}>{message}</p>
      </div>
    </>
  );
};

export default ErrorPage;
