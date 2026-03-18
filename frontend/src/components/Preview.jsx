import React, { useEffect, useState } from 'react';

function Preview({ fileId, apiBase }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewInfo, setPreviewInfo] = useState(null);

  // Нормализация apiBase - убираем дублирование /api
  const getApiUrl = (endpoint) => {
    const base = (apiBase || 'http://localhost:8000').replace(/\/api$/, '');
    return `${base}/api${endpoint}`;
  };

  useEffect(() => {
    if (fileId) {
      createPreview();
    } else {
      setPreview(null);
      setPreviewInfo(null);
      setError('');
    }
  }, [fileId]);

  const createPreview = async () => {
    if (!fileId) return;

    setLoading(true);
    setError('');

    try {
      const url = getApiUrl('/preview');
      console.log('Creating preview:', url, fileId);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, duration: 5 })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('Preview response:', data);

      if (data.status === 'success' || data.preview_url) {
        // Добавляем timestamp для предотвращения кэширования
        const previewUrl = data.preview_url || `/api/files/preview/${data.filename}`;
        setPreview(previewUrl + '?t=' + Date.now());
        setPreviewInfo(data);
      } else {
        throw new Error(data.message || 'Preview failed');
      }
    } catch (e) {
      console.error('Preview error:', e);
      setError(`❌ Ошибка превью: ${e.message}`);
      setPreview(null);
      setPreviewInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    createPreview();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>👁️ Превью</h2>
        {fileId && (
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={styles.refreshButton}
          >
            🔄
          </button>
        )}
      </div>

      <div style={styles.previewBox}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span>⏳ Создание превью...</span>
          </div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : preview ? (
          <div style={styles.videoContainer}>
            <video
              src={preview}
              style={styles.video}
              controls
              autoPlay
              loop
              muted
              playsInline
            >
              Your browser does not support the video tag.
            </video>
            {previewInfo && (
              <div style={styles.videoInfo}>
                <span>📹 {previewInfo.duration}s • {previewInfo.size_mb} MB</span>
              </div>
            )}
          </div>
        ) : fileId ? (
          <div style={styles.placeholder}>
            <span style={styles.placeholderIcon}>📷</span>
            <span>Превью загружается...</span>
          </div>
        ) : (
          <div style={styles.placeholder}>
            <span style={styles.placeholderIcon}>📁</span>
            <span>Выберите видео для превью</span>
          </div>
        )}
      </div>

      {preview && (
        <div style={styles.info}>
          <p style={styles.infoText}>📹 Файл: {fileId}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    background: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #333',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '20px',
  },
  refreshButton: {
    padding: '8px 12px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
  previewBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    borderRadius: '4px',
    minHeight: '200px',
    position: 'relative',
    overflow: 'hidden',
  },
  videoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  video: {
    maxWidth: '100%',
    maxHeight: 'calc(100% - 30px)',
    objectFit: 'contain',
    borderRadius: '4px',
    backgroundColor: '#000',
  },
  videoInfo: {
    marginTop: '10px',
    padding: '5px 10px',
    background: 'rgba(0,0,0,0.7)',
    borderRadius: '4px',
    color: '#888',
    fontSize: '12px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '4px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    color: '#888',
    fontSize: '14px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #333',
    borderTop: '3px solid #ff5500',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '14px',
    padding: '20px',
    textAlign: 'center',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    color: '#666',
    fontSize: '14px',
  },
  placeholderIcon: {
    fontSize: '48px',
  },
  info: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #333',
  },
  infoText: {
    color: '#888',
    fontSize: '12px',
    margin: 0,
    wordBreak: 'break-all',
  },
};

// Добавляем CSS анимацию для спиннера
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.getElementById('preview-spinner-style')) {
  styleElement.id = 'preview-spinner-style';
  document.head.appendChild(styleElement);
}

export default Preview;
