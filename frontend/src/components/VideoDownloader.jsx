import React, { useState, useEffect } from 'react';

export default function VideoDownloader({ apiBase = '/api' }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error' | 'info'
  const [downloadedVideos, setDownloadedVideos] = useState([]);
  const [progress, setProgress] = useState(0);
  const [downloadQuality, setDownloadQuality] = useState('best');

  const API_BASE = apiBase || 'http://localhost:8000/api';

  useEffect(() => {
    loadDownloadedVideos();
  }, []);

  const loadDownloadedVideos = async () => {
    try {
      const res = await fetch(`${API_BASE}/files?directory=downloads`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setDownloadedVideos(data.files || []);
    } catch (e) {
      console.error('Load videos error:', e);
    }
  };

  const validateYouTubeUrl = (url) => {
    const youtubePatterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[\w-]{11}/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=[\w-]+/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]{11}/,
    ];
    return youtubePatterns.some(pattern => pattern.test(url));
  };

  const handleDownload = async () => {
    if (!youtubeUrl.trim()) {
      setMessage('❌ Введи ссылку на YouTube видео');
      setMessageType('error');
      return;
    }

    if (!validateYouTubeUrl(youtubeUrl)) {
      setMessage('❌ Неверный формат ссылки. Используй: https://www.youtube.com/watch?v=xxx');
      setMessageType('error');
      return;
    }

    setDownloading(true);
    setProgress(10);
    setMessage('⏳ Скачиваю видео с YouTube...');
    setMessageType('info');

    try {
      const res = await fetch(`${API_BASE}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: youtubeUrl, // Правильное имя поля для backend
          quality: downloadQuality,
        }),
      });

      setProgress(50);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();

      setProgress(100);

      if (data.filename || data.file_id) {
        setMessage(`✅ Видео скачано: ${data.filename || data.file_id}`);
        setMessageType('success');
        setYoutubeUrl('');
        loadDownloadedVideos();

        // Очищаем прогресс через 2 секунды
        setTimeout(() => {
          setProgress(0);
          setMessage('');
          setMessageType('');
        }, 2000);
      } else {
        throw new Error(data.message || 'Download failed');
      }
    } catch (e) {
      console.error('Download error:', e);
      setMessage(`❌ Ошибка скачивания: ${e.message}`);
      setMessageType('error');
      setProgress(0);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Удалить ${filename}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/files/${filename}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.status === 'success' || res.ok) {
        setMessage('✅ Видео удалено');
        setMessageType('success');
        loadDownloadedVideos();
        
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 2000);
      } else {
        throw new Error(data.detail || 'Delete failed');
      }
    } catch (e) {
      setMessage(`❌ Ошибка: ${e.message}`);
      setMessageType('error');
    }
  };

  const handlePlayPreview = (filename) => {
    // Убираем /api из apiBase для правильного URL
    const base = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
    const videoUrl = `${base}/download-file/${encodeURIComponent(filename)}`;
    window.open(videoUrl, '_blank');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !downloading && youtubeUrl.trim()) {
      handleDownload();
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <span style={styles.icon}>▶️</span> Скачать с YouTube
      </h3>

      {message && (
        <div style={{
          ...styles.message,
          ...styles[messageType],
        }}>
          {message}
        </div>
      )}

      {/* Прогресс бар */}
      {progress > 0 && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: `${progress}%`,
            }}></div>
          </div>
        </div>
      )}

      {/* Ввод URL */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>🔗 YouTube ссылка:</label>
        <div style={styles.urlInput}>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={downloading}
            style={{
              ...styles.input,
              opacity: downloading ? 0.6 : 1,
              cursor: downloading ? 'not-allowed' : 'text',
            }}
          />
          <button
            onClick={handleDownload}
            disabled={downloading || !youtubeUrl.trim()}
            style={{
              ...styles.downloadButton,
              opacity: downloading || !youtubeUrl.trim() ? 0.6 : 1,
              cursor: downloading || !youtubeUrl.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {downloading ? '⏳' : '▶️'}
          </button>
        </div>

        {/* Выбор качества */}
        <div style={styles.qualitySelect}>
          <label style={styles.qualityLabel}>
            🎬 Качество:
            <select
              value={downloadQuality}
              onChange={(e) => setDownloadQuality(e.target.value)}
              disabled={downloading}
              style={{
                ...styles.select,
                opacity: downloading ? 0.6 : 1,
                cursor: downloading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="best">🔥 Лучшее (авто)</option>
              <option value="4K">4K (2160p)</option>
              <option value="1440p">1440p</option>
              <option value="1080p">1080p - Full HD</option>
              <option value="720p">720p - HD</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
            </select>
          </label>
        </div>

        <p style={styles.hint}>
          💡 Поддерживаются: watch?v=, youtu.be, shorts, playlists
        </p>
      </div>

      {/* Список скачанных видео */}
      <div style={styles.videosSection}>
        <h4 style={styles.videosTitle}>
          📹 Скачанные видео ({downloadedVideos.length})
        </h4>

        {downloadedVideos.length > 0 ? (
          <div style={styles.videosGrid}>
            {downloadedVideos.map((video) => (
              <div key={video.name} style={styles.videoCard}>
                <div style={styles.videoName}>
                  🎬 {video.name}
                </div>
                <div style={styles.videoMeta}>
                  📊 {(video.size / 1024 / 1024).toFixed(1)} MB
                </div>
                <div style={styles.videoDate}>
                  🕐 {new Date(video.modified).toLocaleDateString('ru-RU')}
                </div>

                {/* Кнопки действий */}
                <div style={styles.videoActions}>
                  <button
                    onClick={() => handlePlayPreview(video.name)}
                    style={styles.previewButton}
                  >
                    ▶️ Просмотр
                  </button>
                  <button
                    onClick={() => handleDelete(video.name)}
                    style={styles.deleteButton}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.emptyText}>
            📭 Нет скачанных видео
          </p>
        )}
      </div>

      {/* Советы */}
      <div style={styles.tips}>
        <strong>💡 Советы:</strong>
        <ul style={styles.tipsList}>
          <li>Скопируй ссылку из браузера</li>
          <li>Видео сохраняется в downloads/</li>
          <li>Максимум: 500 MB</li>
          <li>Автовыбор лучшего качества</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    background: '#1a1a1a',
    color: '#fff',
    borderRadius: '8px',
    border: '2px solid #FF0000',
    boxShadow: '0 0 20px rgba(255, 0, 0, 0.2)',
  },
  title: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    fontSize: '20px',
  },
  message: {
    marginBottom: '15px',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid',
  },
  success: {
    background: '#1a3a1a',
    color: '#4ade80',
    borderColor: '#22c55e',
  },
  error: {
    background: '#3a1a1a',
    color: '#ff6b6b',
    borderColor: '#ef4444',
  },
  info: {
    background: '#1a2a3a',
    color: '#60a5fa',
    borderColor: '#3b82f6',
  },
  progressContainer: {
    marginBottom: '15px',
    background: '#2a2a2a',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '6px',
    border: '1px solid #FF0000',
  },
  progressBar: {
    width: '100%',
    height: '100%',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FF0000, #cc0000)',
    transition: 'width 0.3s ease',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  urlInput: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '10px',
  },
  input: {
    padding: '12px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  downloadButton: {
    padding: '12px 24px',
    background: '#FF0000',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  qualitySelect: {
    marginTop: '10px',
  },
  qualityLabel: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    fontSize: '14px',
  },
  select: {
    padding: '8px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '13px',
  },
  hint: {
    margin: '12px 0 0 0',
    fontSize: '12px',
    color: '#888',
    lineHeight: '1.5',
  },
  videosSection: {
    marginTop: '20px',
  },
  videosTitle: {
    margin: '0 0 15px 0',
    paddingBottom: '10px',
    borderBottom: '1px solid #333',
    fontSize: '14px',
    color: '#ccc',
  },
  videosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  videoCard: {
    padding: '12px',
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  videoName: {
    margin: '0 0 8px 0',
    fontWeight: 'bold',
    wordBreak: 'break-word',
    fontSize: '13px',
    color: '#FF0000',
  },
  videoMeta: {
    margin: '5px 0',
    fontSize: '12px',
    color: '#aaa',
  },
  videoDate: {
    margin: '5px 0 10px 0',
    fontSize: '11px',
    color: '#888',
  },
  videoActions: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '8px',
  },
  previewButton: {
    padding: '6px 10px',
    background: '#1a3a6b',
    color: '#4ade80',
    border: '1px solid #0284c7',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: '6px 10px',
    background: '#3a1a1a',
    color: '#ff6b6b',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
  tips: {
    marginTop: '20px',
    padding: '12px',
    background: '#1a3a1a',
    border: '1px solid #22c55e',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#4ade80',
  },
  tipsList: {
    margin: '8px 0 0 20px',
    paddingLeft: '0',
    lineHeight: '1.6',
  },
};
