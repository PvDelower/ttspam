import React, { useState, useEffect } from 'react';

export default function VideoProcessor({
  apiBase = '/api',
  selectedVideo: selectedVideoProp = '',
}) {
  const [videos, setVideos] = useState([]);
  const [banners, setBanners] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(selectedVideoProp || '');
  const [selectedBanner, setSelectedBanner] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1.0);
  const [saturation, setSaturation] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Загрузка данных при монтировании
  useEffect(() => {
    loadVideos();
    loadBanners();
  }, []);

  // Синхронизация с внешним selectedVideo
  useEffect(() => {
    if (selectedVideoProp) {
      setSelectedVideo(selectedVideoProp);
    }
  }, [selectedVideoProp]);

  const loadVideos = async () => {
    try {
      const response = await fetch(`${apiBase}/files?directory=downloads`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setVideos(data.files || []);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('❌ Ошибка загрузки видео: ' + err.message);
    }
  };

  const loadBanners = async () => {
    try {
      // Пробуем разные эндпоинты для баннеров
      let response;
      try {
        response = await fetch(`${apiBase}/banners`);
      } catch {
        response = await fetch(`${apiBase}/files?directory=banners`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setBanners(data.banners || data.files || []);
    } catch (err) {
      console.error('Error loading banners:', err);
      // Не показываем ошибку пользователю, баннеры опциональны
    }
  };

  // Валидация времени
  const validateTime = (timeStr) => {
    if (!timeStr) return true;
    const timeRegex = /^(\d+(:(\d{1,2}(:(\d{1,2})?)?)?)?)?(\.\d+)?$/;
    return timeRegex.test(timeStr);
  };

  const convertToSeconds = (timeStr) => {
    if (!timeStr) return null;

    try {
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':');

        if (parts.length === 2) {
          // MM:SS
          const minutes = parseInt(parts[0], 10);
          const seconds = parseFloat(parts[1]);
          return minutes * 60 + seconds;
        } else if (parts.length === 3) {
          // HH:MM:SS
          const hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          const seconds = parseFloat(parts[2]);
          return hours * 3600 + minutes * 60 + seconds;
        }
      } else {
        // Просто число (секунды)
        return parseFloat(timeStr);
      }
    } catch (e) {
      console.error('Error parsing time:', e);
      return null;
    }
  };

  const handleProcess = async (e) => {
    e.preventDefault();

    if (!selectedVideo) {
      setError('📹 Выбери видео для обработки');
      return;
    }

    // Валидация времени
    if (startTime && !validateTime(startTime)) {
      setError('❌ Неверный формат начального времени (используй 5, 0:30, 1:30)');
      return;
    }

    if (endTime && !validateTime(endTime)) {
      setError('❌ Неверный формат конечного времени');
      return;
    }

    // Проверка логики времени
    const startSeconds = convertToSeconds(startTime);
    const endSeconds = convertToSeconds(endTime);

    if (startSeconds !== null && endSeconds !== null && endSeconds <= startSeconds) {
      setError('❌ Время окончания должно быть больше времени начала');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Нормализуем apiBase - убираем /api если есть в конце
      const normalizedApiBase = (apiBase || '/api').replace(/\/api$/, '');
      
      // Формируем правильный payload для VideoProcessor.process()
      const payload = {
        file_id: selectedVideo,
        trim: (startTime || endTime) ? {
          start: startSeconds || 0,
          end: endSeconds || undefined,
        } : null,
        effects: (brightness !== 0 || contrast !== 1.0 || saturation !== 1.0) ? {
          brightness: brightness !== 0 ? brightness : undefined,
          contrast: contrast !== 1.0 ? contrast : undefined,
          saturation: saturation !== 1.0 ? saturation : undefined,
        } : null,
        banner: selectedBanner ? {
          filename: selectedBanner,
          position: 'bottom',
          height: 100,
          transparent: true,
        } : null,
      };

      // Удаляем null поля
      if (!payload.trim) delete payload.trim;
      if (!payload.effects) delete payload.effects;
      if (!payload.banner) delete payload.banner;

      console.log('📋 Отправка запроса:', payload);

      const response = await fetch(`${normalizedApiBase}/api/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Processing failed');
      }

      setSuccess(`✅ Видео обработано! ${data.data?.filename || data.filename || 'готово'}`);

      // Сброс формы
      setSelectedVideo('');
      setStartTime('');
      setEndTime('');
      setBrightness(0);
      setContrast(1.0);
      setSaturation(1.0);
      setSelectedBanner('');

      // Обновляем список файлов через 2 секунды
      setTimeout(loadVideos, 2000);
    } catch (err) {
      console.error('Processing error:', err);
      setError(`❌ Ошибка обработки: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🎬 Обработка видео</h2>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleProcess} style={styles.form}>
          {/* Выбор видео */}
          <div style={styles.formGroup}>
            <label style={styles.label}>📹 Выбери видео:</label>
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              <option value="">-- Выбери видео --</option>
              {videos.map((video) => (
                <option key={video.name} value={video.name}>
                  {video.name} ({Math.round(video.size / 1024 / 1024)} MB)
                </option>
              ))}
            </select>
          </div>

          {/* Обрезка */}
          <div style={styles.formGroup}>
            <label style={styles.label}>✂️ Обрезка (опционально):</label>
            <div style={styles.timeInputs}>
              <input
                type="text"
                placeholder="Начало (5, 0:30)"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Конец (10, 1:00)"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
            <p style={styles.hint}>
              Форматы: 5 (сек), 1:30 (мин:сек), 0:01:30 (часы:мин:сек)
            </p>
          </div>

          {/* Эффекты */}
          <div style={styles.formGroup}>
            <label style={styles.label}>🌟 Эффекты:</label>

            <div style={styles.effectRow}>
              <label style={styles.effectLabel}>Яркость:</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                style={styles.slider}
                disabled={loading}
              />
              <span style={styles.effectValue}>{parseFloat(brightness).toFixed(1)}</span>
            </div>

            <div style={styles.effectRow}>
              <label style={styles.effectLabel}>Контраст:</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={contrast}
                onChange={(e) => setContrast(e.target.value)}
                style={styles.slider}
                disabled={loading}
              />
              <span style={styles.effectValue}>{parseFloat(contrast).toFixed(1)}</span>
            </div>

            <div style={styles.effectRow}>
              <label style={styles.effectLabel}>Насыщенность:</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={saturation}
                onChange={(e) => setSaturation(e.target.value)}
                style={styles.slider}
                disabled={loading}
              />
              <span style={styles.effectValue}>{parseFloat(saturation).toFixed(1)}</span>
            </div>
          </div>

          {/* Баннер */}
          <div style={styles.formGroup}>
            <label style={styles.label}>🎨 Баннер (опционально):</label>
            <select
              value={selectedBanner}
              onChange={(e) => setSelectedBanner(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              <option value="">-- Без баннера --</option>
              {banners.map((banner) => (
                <option key={banner.id || banner.name} value={banner.name}>
                  {banner.name}
                </option>
              ))}
            </select>
          </div>

          {/* Кнопка */}
          <button
            type="submit"
            disabled={loading || !selectedVideo}
            style={{
              ...styles.button,
              opacity: loading || !selectedVideo ? 0.5 : 1,
              cursor: loading || !selectedVideo ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Обрабатываю...' : '🎬 Обработать'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    background: '#1a1a1a',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #333',
    height: '100%',
    boxSizing: 'border-box',
  },
  title: {
    color: '#fff',
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: '#ccc',
    fontSize: '14px',
    fontWeight: '500',
  },
  select: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #444',
    background: '#2a2a2a',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  input: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #444',
    background: '#2a2a2a',
    color: '#fff',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  timeInputs: {
    display: 'flex',
    gap: '10px',
  },
  hint: {
    color: '#888',
    fontSize: '12px',
    margin: '5px 0 0 0',
  },
  effectRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#ccc',
    marginBottom: '8px',
  },
  effectLabel: {
    minWidth: '80px',
    fontSize: '13px',
  },
  slider: {
    flex: 1,
    cursor: 'pointer',
  },
  effectValue: {
    minWidth: '35px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  button: {
    padding: '12px 20px',
    borderRadius: '4px',
    border: 'none',
    background: '#ff5500',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '10px',
    transition: 'all 0.2s ease',
  },
  error: {
    padding: '10px 15px',
    borderRadius: '4px',
    background: '#cc0000',
    color: '#fff',
    marginBottom: '15px',
    fontSize: '14px',
  },
  success: {
    padding: '10px 15px',
    borderRadius: '4px',
    background: '#00cc00',
    color: '#000',
    marginBottom: '15px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
