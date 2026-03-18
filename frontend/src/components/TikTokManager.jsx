import React, { useState, useEffect } from 'react';

export default function TikTokManager({ apiBase = '/api' }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [videos, setVideos] = useState([]);
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const API_BASE = apiBase || 'http://localhost:8000/api';

  useEffect(() => {
    loadAccounts();
    loadVideos();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/tiktok/accounts`);
      if (!res.ok) {
        setAccounts([]);
        return;
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
      if (data.accounts && data.accounts.length > 0) {
        setSelectedAccount(data.accounts[0].account_id);
      }
    } catch (e) {
      console.error('Load accounts error:', e);
      setAccounts([]);
    }
  };

  const loadVideos = async () => {
    try {
      const res = await fetch(`${API_BASE}/tiktok/videos`);
      if (!res.ok) {
        setVideos([]);
        return;
      }
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (e) {
      console.error('Load videos error:', e);
      setVideos([]);
    }
  };

  const handleAddAccount = async () => {
    setLoading(true);
    setMessage('⏳ Открываю авторизацию...');
    setMessageType('info');

    try {
      const res = await fetch(`${API_BASE}/tiktok/auth`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.status === 'success' || data.auth_url) {
        setMessage('✅ Открой ссылку для авторизации');
        setMessageType('success');
        if (data.auth_url) {
          window.open(data.auth_url, 'tiktok_auth', 'width=600,height=700');
        }
        setTimeout(loadAccounts, 3000);
      } else {
        throw new Error(data.detail || 'Auth failed');
      }
    } catch (e) {
      setMessage(`❌ Ошибка: ${e.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Удалить аккаунт?')) return;

    try {
      const res = await fetch(`${API_BASE}/tiktok/account/${accountId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.status === 'success' || res.ok) {
        setMessage('✅ Аккаунт удалён');
        setMessageType('success');
        loadAccounts();
      } else {
        throw new Error(data.detail || 'Delete failed');
      }
    } catch (e) {
      setMessage(`❌ Ошибка: ${e.message}`);
      setMessageType('error');
    }
  };

  const handleRefreshStatus = async (videoId, accountId) => {
    try {
      const res = await fetch(
        `${API_BASE}/tiktok/video/${videoId}/status?account_id=${accountId}`
      );
      const data = await res.json();

      if (data.status === 'success') {
        setMessage(`✅ Статус: ${data.video_status}`);
        setMessageType('success');
        loadVideos();
      }
    } catch (e) {
      setMessage(`❌ Ошибка: ${e.message}`);
      setMessageType('error');
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎵 TikTok Менеджер</h3>

      {message && (
        <div style={{
          ...styles.message,
          ...styles[messageType],
        }}>
          {message}
        </div>
      )}

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>➕ Добавить Аккаунт</h4>
        <div style={styles.inputGroup}>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Имя аккаунта (опционально)"
            style={styles.input}
            disabled={loading}
          />
          <button
            onClick={handleAddAccount}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳' : '🔗'} Авторизация
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>📝 Мои Аккаунты ({accounts.length})</h4>
        {accounts.length > 0 ? (
          <div style={styles.accountsGrid}>
            {accounts.map((acc) => (
              <div
                key={acc.account_id}
                style={{
                  ...styles.accountCard,
                  border: selectedAccount === acc.account_id 
                    ? '2px solid #38BDF8' 
                    : '1px solid #444',
                  background: selectedAccount === acc.account_id 
                    ? '#2a4a2a' 
                    : '#2a2a2a',
                }}
                onClick={() => setSelectedAccount(acc.account_id)}
              >
                <div style={styles.accountName}>
                  👤 {acc.account_name || 'Без имени'}
                </div>
                <div style={styles.accountNickname}>
                  {acc.nickname ? `@${acc.nickname}` : 'Не заполнено'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAccount(acc.account_id);
                  }}
                  style={styles.deleteButton}
                >
                  🗑️ Удалить
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.emptyText}>Нет подключённых аккаунтов</p>
        )}
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>📺 Загруженные Видео ({videos.length})</h4>
        <div style={styles.videosList}>
          {videos.length === 0 ? (
            <p style={styles.emptyText}>Нет загруженных видео</p>
          ) : (
            videos.map((video) => (
              <div key={video.record_id} style={styles.videoItem}>
                <div style={styles.videoInfo}>
                  <div style={styles.videoId}>{video.local_file_id}</div>
                  <div style={styles.videoTiktokId}>
                    TikTok ID: {video.tiktok_video_id?.substring(0, 8) || '???'}...
                  </div>
                  <div style={styles.videoStatus}>
                    {video.status === 'live' && '🟢 Live'}
                    {video.status === 'processing' && '🟡 Processing'}
                    {video.status === 'rejected' && '🔴 Rejected'}
                    {video.status === 'error' && '❌ Error'}
                    {!['live', 'processing', 'rejected', 'error'].includes(video.status) && `📊 ${video.status}`}
                    {video.last_error && ` - ${video.last_error}`}
                  </div>
                </div>
                <button
                  onClick={() => handleRefreshStatus(video.tiktok_video_id, video.account_id)}
                  style={styles.refreshButton}
                >
                  🔄
                </button>
              </div>
            ))
          )}
        </div>
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
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '14px',
    color: '#ccc',
    paddingBottom: '10px',
    borderBottom: '1px solid #333',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '10px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
  },
  button: {
    padding: '10px 20px',
    background: '#38BDF8',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
  },
  accountCard: {
    padding: '15px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  accountName: {
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '14px',
  },
  accountNickname: {
    fontSize: '12px',
    color: '#888',
  },
  deleteButton: {
    marginTop: '10px',
    padding: '5px 10px',
    background: '#ff6b6b',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    width: '100%',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
  videosList: {
    maxHeight: '300px',
    overflowY: 'auto',
    background: '#0a0a0a',
    borderRadius: '4px',
    padding: '10px',
  },
  videoItem: {
    padding: '10px',
    background: '#1a1a1a',
    borderBottom: '1px solid #333',
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoId: {
    color: '#38BDF8',
    marginBottom: '4px',
  },
  videoTiktokId: {
    color: '#888',
    marginBottom: '4px',
  },
  videoStatus: {
    marginTop: '4px',
  },
  refreshButton: {
    padding: '5px 10px',
    background: '#38BDF8',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginLeft: '10px',
  },
};
