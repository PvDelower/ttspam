import React, { useState, useEffect } from 'react';

export default function SchedulePost({ apiBase = '/api' }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const API_BASE = apiBase || 'http://localhost:8000/api';

  useEffect(() => {
    loadFiles();
    loadScheduledPosts();
  }, []);

  const loadFiles = async () => {
    try {
      // Пробуем outputs и downloads
      const [outputsRes, downloadsRes] = await Promise.all([
        fetch(`${API_BASE}/files?directory=outputs`).catch(() => null),
        fetch(`${API_BASE}/files?directory=downloads`).catch(() => null),
      ]);

      let allFiles = [];
      
      if (outputsRes?.ok) {
        const outputsData = await outputsRes.json();
        allFiles = [...(outputsData.files || [])];
      }
      
      if (downloadsRes?.ok) {
        const downloadsData = await downloadsRes.json();
        allFiles = [...allFiles, ...(downloadsData.files || [])];
      }

      setFiles(allFiles);
    } catch (e) {
      console.error('Load files error:', e);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/scheduled_posts`);
      if (!res.ok) {
        setScheduledPosts([]);
        return;
      }
      const data = await res.json();
      setScheduledPosts(data.posts || data.scheduled || []);
    } catch (e) {
      console.error('Load posts error:', e);
      setScheduledPosts([]);
    }
  };

  const handleSchedule = async () => {
    if (!selectedFile) {
      setMessage('❌ Выбери видео');
      setMessageType('error');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      setMessage('❌ Укажи дату и время');
      setMessageType('error');
      return;
    }

    // Проверка: время должно быть в будущем
    const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    const now = new Date();
    
    if (scheduleDateTime <= now) {
      setMessage('❌ Время должно быть в будущем');
      setMessageType('error');
      return;
    }

    setScheduling(true);
    setMessage('⏳ Планирую пост...');
    setMessageType('info');

    const payload = {
      video_filename: selectedFile,
      caption: caption || 'Check this out! 🎬',
      schedule_time: scheduleDateTime.toISOString(),
    };

    try {
      const res = await fetch(`${API_BASE}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (data.status === 'success' || res.ok) {
        setMessage(`✅ Пост запланирован на ${scheduleDateTime.toLocaleString('ru-RU')}`);
        setMessageType('success');
        setSelectedFile(null);
        setCaption('');
        setScheduleDate('');
        setScheduleTime('12:00');
        loadScheduledPosts();
        
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 3000);
      } else {
        throw new Error(data.detail || data.message || 'Schedule failed');
      }
    } catch (e) {
      console.error('Schedule error:', e);
      setMessage(`❌ Ошибка: ${e.message}`);
      setMessageType('error');
    } finally {
      setScheduling(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Удалить этот запланированный пост?')) return;

    try {
      const res = await fetch(`${API_BASE}/scheduled_posts/${postId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.status === 'success' || res.ok) {
        setMessage('✅ Пост удален');
        setMessageType('success');
        loadScheduledPosts();
        
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

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📅 Запланировать Пост</h3>

      {message && (
        <div style={{
          ...styles.message,
          ...styles[messageType],
        }}>
          {message}
        </div>
      )}

      {/* Выбор видео */}
      <div style={styles.formGroup}>
        <label style={styles.label}>📹 Выбрать Видео:</label>
        <select
          value={selectedFile || ''}
          onChange={(e) => setSelectedFile(e.target.value)}
          style={styles.select}
          disabled={scheduling}
        >
          <option value="">-- Выбрать файл --</option>
          {files.map((file) => (
            <option key={file.name} value={file.name}>
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </option>
          ))}
        </select>
      </div>

      {/* Подпись */}
      <div style={styles.formGroup}>
        <label style={styles.label}>📝 Подпись:</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Введи текст подписи (макс 2200 символов)"
          maxLength="2200"
          style={styles.textarea}
          disabled={scheduling}
        />
        <p style={styles.charCount}>
          {caption.length}/2200 символов
        </p>
      </div>

      {/* Время публикации */}
      <div style={styles.formGroup}>
        <label style={styles.label}>⏰ Время Публикации:</label>
        <div style={styles.dateTimeRow}>
          <label style={styles.dateTimeLabel}>
            📅 Дата:
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              style={styles.dateInput}
              disabled={scheduling}
              min={new Date().toISOString().split('T')[0]}
            />
          </label>
          <label style={styles.dateTimeLabel}>
            🕐 Время:
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              style={styles.timeInput}
              disabled={scheduling}
            />
          </label>
        </div>
      </div>

      <button
        onClick={handleSchedule}
        disabled={scheduling || !selectedFile || !scheduleDate || !scheduleTime}
        style={{
          ...styles.scheduleButton,
          opacity: scheduling || !selectedFile || !scheduleDate || !scheduleTime ? 0.6 : 1,
          cursor: scheduling || !selectedFile || !scheduleDate || !scheduleTime ? 'not-allowed' : 'pointer',
        }}
      >
        {scheduling ? '⏳ Планирую...' : '✅ Запланировать'}
      </button>

      {/* Список запланированных */}
      <hr style={styles.separator} />

      <h4 style={styles.postsTitle}>
        📋 Запланированные Посты ({scheduledPosts.length})
      </h4>
      
      {scheduledPosts.length > 0 ? (
        <div style={styles.postsGrid}>
          {scheduledPosts.map((post) => (
            <div key={post.id} style={styles.postCard}>
              <div style={styles.postVideo}>
                📹 {post.video_filename || post.file_id || post.filename}
              </div>
              <div style={styles.postTime}>
                📅 {new Date(post.schedule_time || post.scheduled_time).toLocaleString('ru-RU')}
              </div>
              <div style={styles.postCaption}>
                "{(post.caption || '').substring(0, 50)}{post.caption?.length > 50 ? '...' : ''}"
              </div>
              <button
                onClick={() => handleDelete(post.id)}
                style={styles.deleteButton}
                disabled={scheduling}
              >
                🗑️ Удалить
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>
          Нет запланированных постов
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
    marginBottom: '15px',
    fontSize: '18px',
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
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  select: {
    width: '100%',
    padding: '10px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontFamily: 'monospace',
    minHeight: '80px',
    resize: 'vertical',
    fontSize: '13px',
  },
  charCount: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    color: '#888',
    textAlign: 'right',
  },
  dateTimeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  dateTimeLabel: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    gap: '5px',
  },
  dateInput: {
    padding: '8px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '13px',
  },
  timeInput: {
    padding: '8px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '13px',
  },
  scheduleButton: {
    width: '100%',
    padding: '12px',
    background: '#38BDF8',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
  separator: {
    borderColor: '#333',
    marginTop: '20px',
    marginBottom: '20px',
  },
  postsTitle: {
    margin: '0 0 15px 0',
    fontSize: '14px',
    color: '#ccc',
  },
  postsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
  },
  postCard: {
    padding: '12px',
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '4px',
  },
  postVideo: {
    fontWeight: 'bold',
    marginBottom: '8px',
    wordBreak: 'break-all',
    fontSize: '13px',
  },
  postTime: {
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '8px',
  },
  postCaption: {
    fontSize: '12px',
    color: '#cbd5e1',
    marginBottom: '10px',
    maxHeight: '40px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deleteButton: {
    width: '100%',
    padding: '8px',
    background: '#FF3B30',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
};
