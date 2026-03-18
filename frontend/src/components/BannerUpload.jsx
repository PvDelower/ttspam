import React, { useState, useEffect } from 'react';

export default function BannerUpload({ apiBase = '/api' }) {
  const [banners, setBanners] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error' | 'info'

  const API_BASE = apiBase || 'http://localhost:8000/api';

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      // Пробуем разные эндпоинты для баннеров
      let response;
      try {
        response = await fetch(`${API_BASE}/banners`);
      } catch {
        response = await fetch(`${API_BASE}/files?directory=banners`);
      }
      
      if (!response.ok) {
        // Если endpoint не существует, это нормально - баннеры опциональны
        setBanners([]);
        return;
      }
      
      const data = await response.json();
      setBanners(data.banners || data.files || []);
    } catch (e) {
      console.error('Load banners error:', e);
      // Не показываем ошибку пользователю
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Проверка расширения
    const ext = file.name.toLowerCase().split('.').pop();
    const allowed = ['gif', 'mp4', 'webm', 'png', 'jpg', 'jpeg', 'webp'];
    if (!allowed.includes(ext)) {
      setMessage(`❌ Неподдерживаемый формат. Допустимые: ${allowed.join(', ')}`);
      setMessageType('error');
      return;
    }

    // Проверка размера (макс 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage(`❌ Файл слишком большой. Максимум 10MB`);
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage('⏳ Загрузка...');
    setMessageType('info');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Пробуем разные эндпоинты для загрузки
      let response;
      const endpoints = [
        `${API_BASE}/banner/upload`,
        `${API_BASE}/banners/upload`,
        `${API_BASE}/files/banner`,
      ];

      for (const endpoint of endpoints) {
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });
          if (response.ok) break;
        } catch {
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP ${response?.status || 'Failed'}`);
      }

      const data = await response.json();

      if (data.status === 'success' || response.ok) {
        setMessage(`✅ Баннер загружен: ${data.banner_id || data.filename || file.name}`);
        setMessageType('success');
        loadBanners();
        e.target.value = ''; // Сброс input
      } else {
        throw new Error(data.detail || 'Upload failed');
      }
    } catch (e) {
      console.error('Upload error:', e);
      setMessage(`❌ Ошибка загрузки: ${e.message}`);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (bannerName) => {
    if (!window.confirm(`Удалить баннер "${bannerName}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/files/${bannerName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('✅ Баннер удален');
        setMessageType('success');
        loadBanners();
      } else {
        throw new Error('Delete failed');
      }
    } catch (e) {
      setMessage(`❌ Ошибка удаления: ${e.message}`);
      setMessageType('error');
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📤 Загрузить Баннер</h3>
      <p style={styles.subtitle}>GIF / MP4 / WebM / PNG</p>

      {message && (
        <div style={{
          ...styles.message,
          ...styles[messageType],
        }}>
          {message}
        </div>
      )}

      <div style={styles.uploadSection}>
        <input
          type="file"
          accept=".gif,.mp4,.webm,.png,.jpg,.jpeg,.webp"
          onChange={handleUpload}
          disabled={uploading}
          style={{
            ...styles.fileInput,
            opacity: uploading ? 0.6 : 1,
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        />
        {uploading && (
          <div style={styles.progress}>
            <div style={styles.progressBar}></div>
            <span style={styles.progressText}>Загрузка...</span>
          </div>
        )}
      </div>

      <h4 style={styles.bannersTitle}>
        Загруженные баннеры ({banners.length})
      </h4>
      
      {banners.length > 0 ? (
        <div style={styles.bannersGrid}>
          {banners.map((banner) => (
            <div key={banner.id || banner.name} style={styles.bannerCard}>
              <div style={styles.bannerName}>
                🎨 {banner.name}
              </div>
              <div style={styles.bannerMeta}>
                📊 {(banner.size / 1024).toFixed(1)} KB
              </div>
              <button
                onClick={() => handleDelete(banner.name)}
                style={styles.deleteButton}
                disabled={uploading}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>
          Нет загруженных баннеров
        </p>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    background: '#1a1a1a',
    color: '#fff',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  title: {
    marginTop: 0,
    marginBottom: '5px',
    fontSize: '18px',
    color: '#fff',
  },
  subtitle: {
    margin: '0 0 15px 0',
    fontSize: '12px',
    color: '#888',
  },
  message: {
    marginBottom: '15px',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  success: {
    background: '#1a3a1a',
    color: '#4ade80',
    border: '1px solid #22c55e',
  },
  error: {
    background: '#3a1a1a',
    color: '#ff6b6b',
    border: '1px solid #ef4444',
  },
  info: {
    background: '#1a2a3a',
    color: '#60a5fa',
    border: '1px solid #3b82f6',
  },
  uploadSection: {
    marginBottom: '20px',
  },
  fileInput: {
    width: '100%',
    padding: '10px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '14px',
  },
  progress: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressBar: {
    flex: 1,
    height: '4px',
    background: '#2a2a2a',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressText: {
    fontSize: '12px',
    color: '#888',
  },
  bannersTitle: {
    margin: '20px 0 15px 0',
    fontSize: '14px',
    color: '#ccc',
    paddingBottom: '10px',
    borderBottom: '1px solid #333',
  },
  bannersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  bannerCard: {
    position: 'relative',
    padding: '10px',
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '12px',
  },
  bannerName: {
    fontWeight: 'bold',
    marginBottom: '5px',
    wordBreak: 'break-all',
  },
  bannerMeta: {
    color: '#888',
    marginBottom: '8px',
  },
  deleteButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 8px',
    background: '#3a1a1a',
    color: '#ff6b6b',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
};
