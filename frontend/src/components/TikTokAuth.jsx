import React, { useState, useEffect } from 'react';

export default function TikTokAuth({ apiBase = '/api' }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const API_BASE = apiBase || 'http://localhost:8000/api';

  useEffect(() => {
    // Проверяем, есть ли callback после авторизации
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth_status');
    
    if (authStatus === 'success') {
      setMessage('✅ Авторизация успешна!');
      setMessageType('success');
      checkAuth();
      // Очищаем URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'failed') {
      setMessage('❌ Ошибка авторизации');
      setMessageType('error');
    }
    
    // Автоматическая проверка при загрузке
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch(`${API_BASE}/tiktok/user`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        setIsAuthenticated(false);
        setUserInfo(null);
        return;
      }
      
      const data = await res.json();

      if (data.status === 'authenticated' || data.authenticated) {
        setIsAuthenticated(true);
        setUserInfo(data.user || data);
        setMessage('✅ Вы авторизованы в TikTok!');
        setMessageType('success');
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (e) {
      console.error('Auth check error:', e);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = () => {
    setMessage('⏳ Перенаправляем на авторизацию TikTok...');
    setMessageType('info');
    setLoading(true);

    // Перенаправляем на auth endpoint
    // Используем правильный endpoint из backend
    const authUrl = `${API_BASE.replace('/api', '')}/tiktok/auth`;
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    setLoading(true);
    setMessage('⏳ Выход из аккаунта...');
    setMessageType('info');
    
    try {
      const res = await fetch(`${API_BASE}/tiktok/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await res.json();

      if (data.status === 'success' || res.ok) {
        setIsAuthenticated(false);
        setUserInfo(null);
        setMessage('✅ Вы вышли из аккаунта');
        setMessageType('success');
      } else {
        throw new Error(data.detail || 'Logout failed');
      }
    } catch (e) {
      console.error('Logout error:', e);
      setMessage(`❌ Ошибка: ${e.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎵 TikTok Авторизация</h3>

      {message && (
        <div style={{
          ...styles.message,
          ...styles[messageType],
        }}>
          {message}
        </div>
      )}

      {!isAuthenticated ? (
        <div style={styles.authButtons}>
          <button
            onClick={handleLogin}
            disabled={loading || checkingAuth}
            style={{
              ...styles.loginButton,
              opacity: loading || checkingAuth ? 0.6 : 1,
              cursor: loading || checkingAuth ? 'not-allowed' : 'pointer',
            }}
          >
            {checkingAuth ? '⏳' : loading ? '⏳' : '🎵'} Войти в TikTok
          </button>
          
          <button
            onClick={checkAuth}
            disabled={checkingAuth}
            style={{
              ...styles.checkButton,
              opacity: checkingAuth ? 0.6 : 1,
              cursor: checkingAuth ? 'not-allowed' : 'pointer',
            }}
          >
            {checkingAuth ? '⏳ Проверка...' : '✔️ Проверить статус'}
          </button>
        </div>
      ) : (
        <div>
          <div style={styles.successBox}>
            <p style={styles.successText}>
              ✅ Авторизован!
            </p>
          </div>
          
          {userInfo && (
            <div style={styles.userInfo}>
              <p style={styles.userInfoTitle}>📊 Информация аккаунта:</p>
              
              {userInfo.user_id && (
                <p style={styles.userInfoRow}>
                  👤 ID: <code style={styles.code}>{userInfo.user_id}</code>
                </p>
              )}
              
              {userInfo.display_name && (
                <p style={styles.userInfoRow}>
                  🎤 Никнейм: <strong>{userInfo.display_name}</strong>
                </p>
              )}
              
              {userInfo.follower_count !== undefined && (
                <p style={styles.userInfoRow}>
                  👥 Подписчики: <strong>{userInfo.follower_count.toLocaleString()}</strong>
                </p>
              )}
              
              {userInfo.video_count !== undefined && (
                <p style={styles.userInfoRow}>
                  🎬 Видео: <strong>{userInfo.video_count}</strong>
                </p>
              )}
            </div>
          )}
          
          <button
            onClick={handleLogout}
            disabled={loading}
            style={{
              ...styles.logoutButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            🚪 Выход
          </button>
        </div>
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
    textAlign: 'center',
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
  authButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  loginButton: {
    padding: '12px 24px',
    background: '#000',
    color: '#fff',
    border: '2px solid #25F4EE',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
  checkButton: {
    padding: '12px 24px',
    background: '#38BDF8',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
  successBox: {
    marginBottom: '15px',
    padding: '12px',
    background: '#1a3a1a',
    borderRadius: '4px',
    border: '1px solid #22c55e',
  },
  successText: {
    margin: 0,
    fontSize: '18px',
    color: '#4ade80',
    fontWeight: 'bold',
  },
  userInfo: {
    marginBottom: '15px',
    padding: '12px',
    background: '#2a2a2a',
    borderRadius: '4px',
    textAlign: 'left',
    border: '1px solid #38BDF8',
  },
  userInfoTitle: {
    margin: '0 0 10px 0',
    fontWeight: 'bold',
    color: '#38BDF8',
    fontSize: '14px',
  },
  userInfoRow: {
    margin: '8px 0',
    fontSize: '13px',
    color: '#cbd5e1',
  },
  code: {
    background: '#1a1a1a',
    padding: '2px 6px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  logoutButton: {
    padding: '12px 24px',
    background: '#FF3B30',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
};
