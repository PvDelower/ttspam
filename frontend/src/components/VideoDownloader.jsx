import { useState } from 'react'

function VideoDownloader() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleDownload = async () => {
    if (!url) {
      setMessage('Пожалуйста, введите URL видео')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('http://localhost:8000/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(`✅ Видео успешно загружено: ${data.filename}`)
      } else {
        setMessage(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      setMessage(`❌ Ошибка соединения: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>📥 Загрузка видео с YouTube</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Вставьте ссылку на видео YouTube или трейлер для загрузки
      </p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '5px',
            border: '1px solid #444',
            backgroundColor: '#333',
            color: 'white',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleDownload}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Загрузка...' : 'Скачать'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '15px',
          borderRadius: '5px',
          backgroundColor: message.includes('✅') ? '#28a74520' : '#dc354520',
          border: `1px solid ${message.includes('✅') ? '#28a745' : '#dc3545'}`,
          color: message.includes('✅') ? '#28a745' : '#dc3545'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#333', borderRadius: '5px' }}>
        <h3>Поддерживаемые форматы:</h3>
        <ul style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li>YouTube видео (любое разрешение)</li>
          <li>YouTube Shorts</li>
          <li>Прямые ссылки на видеофайлы</li>
        </ul>
      </div>
    </div>
  )
}

export default VideoDownloader
