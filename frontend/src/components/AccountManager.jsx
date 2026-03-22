import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function AccountManager() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/accounts`)
      const data = await response.json()
      
      if (response.ok) {
        setAccounts(data.accounts || [])
      } else {
        setMessage(`❌ Ошибка загрузки: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Ошибка соединения: Проверьте подключение к серверу (${API_URL})`)
      console.error('Fetch accounts error:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshStatus = async (accountId) => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/${accountId}/refresh`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchAccounts()
        setMessage('✅ Статус обновлен')
      }
    } catch (error) {
      setMessage(`❌ Ошибка: Проверьте подключение к серверу (${API_URL})`)
      console.error('Refresh status error:', error)
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#28a745'
      case 'banned': return '#dc3545'
      case 'shadowban': return '#ffc107'
      case 'inactive': return '#6c757d'
      default: return '#aaa'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'active': return 'Активен'
      case 'banned': return 'Заблокирован'
      case 'shadowban': return 'Теневой бан'
      case 'inactive': return 'Неактивен'
      default: return status || 'Неизвестно'
    }
  }

  return (
    <div>
      <h2>👥 Менеджер аккаунтов TikTok</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Контроль статусов аккаунтов и управление через API TikTok
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={fetchAccounts}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 Обновить список
        </button>
        
        {message && (
          <span style={{ color: message.includes('✅') ? '#28a745' : '#dc3545' }}>
            {message}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
          ⏳ Загрузка аккаунтов...
        </div>
      ) : accounts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: '#333', 
          borderRadius: '5px' 
        }}>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>Аккаунты не найдены</p>
          <button
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ➕ Добавить аккаунт
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {accounts.map((account) => (
            <div
              key={account.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: '#333',
                borderRadius: '5px',
                border: `2px solid ${getStatusColor(account.status)}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: '#444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  {account.avatar || '👤'}
                </div>
                
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{account.username}</h3>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>
                    {account.email || account.phone}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  padding: '5px 15px',
                  borderRadius: '20px',
                  backgroundColor: getStatusColor(account.status),
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {getStatusText(account.status)}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>
                    Видео: <strong style={{ color: 'white' }}>{account.videosCount || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>
                    Просмотры: <strong style={{ color: 'white' }}>{account.viewsCount || 0}</strong>
                  </div>
                </div>

                <button
                  onClick={() => refreshStatus(account.id)}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔄
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '5px' }}>
        <h3>📊 Статистика</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#444', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {accounts.length}
            </div>
            <div style={{ color: '#aaa', fontSize: '14px' }}>Всего аккаунтов</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#444', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              {accounts.filter(a => a.status === 'active').length}
            </div>
            <div style={{ color: '#aaa', fontSize: '14px' }}>Активны</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#444', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
              {accounts.filter(a => a.status === 'banned').length}
            </div>
            <div style={{ color: '#aaa', fontSize: '14px' }}>Забанены</div>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#444', borderRadius: '5px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
              {accounts.filter(a => a.status === 'shadowban').length}
            </div>
            <div style={{ color: '#aaa', fontSize: '14px' }}>Теневой бан</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountManager
