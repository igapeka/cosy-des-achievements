import Button from "../../components/Button/Button";
import CollectionFolder from "../../components/CollectionFolder/CollectionFolder";
import Icon from "../../components/Icon/Icon";
import styles from "./MainPage.module.css";

type MainCollection = {
  id: string;
  title: string;
  stickers: { id: string; src: string; alt: string }[];
};

type MainPageProps = {
  name: string;
  collections: MainCollection[];
  onOpenCollection: (collectionId: string) => void;
  onOpenLaptop: () => void;
};

const MainPage = ({
  name,
  collections,
  onOpenCollection,
  onOpenLaptop,
}: MainPageProps) => {
  return (
    <>
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>DES Ачивки</h1>
            <p className={styles.name}>{name}</p>
          </div>
          <Button
            variant="primary"
            icon={<Icon name="icon-image.svg" />}
            onClick={onOpenLaptop}
            aria-label="Открыть ноутбук"
          />
        </div>
        <div className={styles.grid}>
          {collections.map((collection) => (
            <CollectionFolder
              key={collection.id}
              title={collection.title}
              stickers={collection.stickers}
              onOpen={() => onOpenCollection(collection.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default MainPage;
