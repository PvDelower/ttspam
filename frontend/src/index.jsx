import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Компонент загрузки с YouTube
function YouTubeDownloader({ apiBase }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState('best');
  
  const API = apiBase || '/api';

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await fetch(`${API}/files?directory=downloads`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setVideos(data.files || []);
    } catch (error) {
      console.error('Load videos error:', error);
    }
  };

  const isValidYouTubeUrl = (url) => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[\w-]{11}/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=[\w-]+/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]{11}/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setMessage('❌ Введи ссылку на YouTube видео');
      setStatus('error');
      return;
    }
    
    if (!isValidYouTubeUrl(url)) {
      setMessage('❌ Неверный формат ссылки. Используй: https://www.youtube.com/watch?v=xxx');
      setStatus('error');
      return;
    }

    setLoading(true);
    setProgress(10);
    setMessage('⏳ Скачиваю видео с YouTube...');
    setStatus('info');

    try {
      const response = await fetch(`${API}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality }),
      });

      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setProgress(100);

      if (result.filename || result.file_id) {
        setMessage(`✅ Видео скачано: ${result.filename || result.file_id}`);
        setStatus('success');
        setUrl('');
        loadVideos();
        setTimeout(() => {
          setProgress(0);
          setMessage('');
          setStatus('');
        }, 2000);
      } else {
        throw new Error(result.message || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setMessage(`❌ Ошибка скачивания: ${error.message}`);
      setStatus('error');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (window.confirm(`Удалить ${filename}?`)) {
      try {
        const response = await fetch(`${API}/files/${filename}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'success' || response.ok) {
          setMessage('✅ Видео удалено');
          setStatus('success');
          loadVideos();
          setTimeout(() => { setMessage(''); setStatus(''); }, 2000);
        } else {
          throw new Error(result.detail || 'Delete failed');
        }
      } catch (error) {
        setMessage(`❌ Ошибка: ${error.message}`);
        setStatus('error');
      }
    }
  };

  const handleView = (filename) => {
    const downloadUrl = `${API.endsWith('/api') ? API.slice(0, -4) : API}/download-file/${encodeURIComponent(filename)}`;
    window.open(downloadUrl, '_blank');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && url.trim()) {
      handleDownload();
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <span style={styles.icon}>▶️</span> Скачать с YouTube
      </h3>
      
      {message && (
        <div style={{ ...styles.message, ...styles[status] }}>{message}</div>
      )}
      
      {progress > 0 && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div style={styles.inputGroup}>
        <label style={styles.label}>🔗 YouTube ссылка:</label>
        <div style={styles.urlInput}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={loading}
            style={{ ...styles.input, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'text' }}
          />
          <button
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            style={{ ...styles.downloadButton, opacity: loading || !url.trim() ? 0.6 : 1, cursor: loading || !url.trim() ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '⏳' : '▶️'}
          </button>
        </div>
        
        <div style={styles.qualitySelect}>
          <label style={styles.qualityLabel}>
            🎬 Качество:
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={loading}
              style={{ ...styles.select, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
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
        
        <p style={styles.hint}>💡 Поддерживаются: watch?v=, youtu.be, shorts, playlists</p>
      </div>

      <div style={styles.videosSection}>
        <h4 style={styles.videosTitle}>📹 Скачанные видео ({videos.length})</h4>
        {videos.length > 0 ? (
          <div style={styles.videosGrid}>
            {videos.map((video) => (
              <div key={video.name} style={styles.videoCard}>
                <div style={styles.videoName}>🎬 {video.name}</div>
                <div style={styles.videoMeta}>📊 {(video.size / 1024 / 1024).toFixed(1)} MB</div>
                <div style={styles.videoDate}>🕐 {new Date(video.modified).toLocaleDateString('ru-RU')}</div>
                <div style={styles.videoActions}>
                  <button onClick={() => handleView(video.name)} style={styles.previewButton}>▶️ Просмотр</button>
                  <button onClick={() => handleDelete(video.name)} style={styles.deleteButton}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.emptyText}>📭 Нет скачанных видео</p>
        )}
      </div>

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

// Главный компонент приложения
function App() {
  const [apiBase] = useState(() => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:8000/api';
    }
    return '/api';
  });

  return (
    <div className="app" style={{ padding: '20px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <header style={{ marginBottom: '20px', borderBottom: '2px solid #FF0000', paddingBottom: '15px' }}>
        <h1 style={{ margin: 0, color: '#FF0000' }}>🎬 TikTok Content Manager</h1>
        <p style={{ margin: '5px 0 0 0', color: '#888' }}>API: <code>{apiBase}</code></p>
      </header>
      
      <main>
        <YouTubeDownloader apiBase={apiBase} />
      </main>
      
      <footer style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '15px', textAlign: 'center', color: '#666' }}>
        <p>Made with 💖 for Deloshera | Backend: Python FastAPI | v3.0</p>
      </footer>
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
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: { fontSize: '20px' },
  message: {
    marginBottom: '15px',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid',
  },
  success: { background: '#1a3a1a', color: '#4ade80', borderColor: '#22c55e' },
  error: { background: '#3a1a1a', color: '#ff6b6b', borderColor: '#ef4444' },
  info: { background: '#1a2a3a', color: '#60a5fa', borderColor: '#3b82f6' },
  progressContainer: {
    marginBottom: '15px',
    background: '#2a2a2a',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '6px',
    border: '1px solid #FF0000',
  },
  progressBar: { width: '100%', height: '100%' },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FF0000, #cc0000)',
    transition: 'width 0.3s ease',
  },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' },
  urlInput: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' },
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
  qualitySelect: { marginTop: '10px' },
  qualityLabel: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' },
  select: {
    padding: '8px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '13px',
  },
  hint: { margin: '12px 0 0 0', fontSize: '12px', color: '#888', lineHeight: '1.5' },
  videosSection: { marginTop: '20px' },
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
  videoName: { margin: '0 0 8px 0', fontWeight: 'bold', wordBreak: 'break-word', fontSize: '13px', color: '#FF0000' },
  videoMeta: { margin: '5px 0', fontSize: '12px', color: '#aaa' },
  videoDate: { margin: '5px 0 10px 0', fontSize: '11px', color: '#888' },
  videoActions: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' },
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
  emptyText: { color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px' },
  tips: {
    marginTop: '20px',
    padding: '12px',
    background: '#1a3a1a',
    border: '1px solid #22c55e',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#4ade80',
  },
  tipsList: { margin: '8px 0 0 20px', paddingLeft: '0', lineHeight: '1.6' },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
