import styles from "./ExportPreviewPage.module.css";

type ExportPreviewPageProps = {
  imageDataUrl: string;
};

const ExportPreviewPage = ({ imageDataUrl }: ExportPreviewPageProps) => {
  return (
    <main className={styles.content}>
      <img
        className={styles.image}
        src={imageDataUrl}
        alt="Готовая картинка с ноутбуком"
      />
    </main>
  );
};

export default ExportPreviewPage;
