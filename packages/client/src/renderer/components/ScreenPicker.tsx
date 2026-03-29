import { useState, useEffect } from 'react';
import styles from './ScreenPicker.module.css';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface ScreenPickerProps {
  onSelect: (sourceId: string) => void;
  onCancel: () => void;
}

export function ScreenPicker({ onSelect, onCancel }: ScreenPickerProps): JSX.Element {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI?.getDesktopSources().then((s) => {
      setSources(s);
      setLoading(false);
    });
  }, []);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Share your screen</h2>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>
        {loading ? (
          <div className={styles.loading}>Loading sources...</div>
        ) : (
          <div className={styles.grid}>
            {sources.map((source) => (
              <button
                key={source.id}
                className={styles.source}
                onClick={() => onSelect(source.id)}
              >
                <img src={source.thumbnail} alt={source.name} className={styles.thumbnail} />
                <span className={styles.sourceName}>{source.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
