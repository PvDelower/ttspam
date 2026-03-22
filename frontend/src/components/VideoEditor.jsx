import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function VideoEditor() {
  const [videoFile, setVideoFile] = useState(null)
  const [gifFile, setGifFile] = useState(null)
  const [settings, setSettings] = useState({
    autoCut: true,
    format: '21:9',
    gifPosition: 'bottom',
    quality: 'high'
  })
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setVideoFile(file)
      setMessage(`📁 Выбран файл: ${file.name}`)
    }
  }

  const handleGifChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setGifFile(file)
    }
  }

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleProcess = async () => {
    if (!videoFile) {
      setMessage('❌ Пожалуйста, выберите видеофайл')
      return
    }

    setProcessing(true)
    setMessage('⏳ Обработка видео...')

    const formData = new FormData()
    formData.append('video', videoFile)
    if (gifFile) formData.append('gif', gifFile)
    formData.append('settings', JSON.stringify(settings))

    try {
      const response = await fetch(`${API_URL}/api/edit`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Видео обработано! Файл: ${data.filename}`)
      } else {
        setMessage(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      setMessage(`❌ Ошибка соединения: Проверьте подключение к серверу (${API_URL})`)
      console.error('Edit error:', error)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <h2>✂️ Видеоредактор</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Настройте параметры автонарезки и добавьте гифку для формата 21:9
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          📹 Видеофайл:
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          style={{
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #444',
            backgroundColor: '#333',
            color: 'white',
            width: '100%'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          🎬 GIF для нижней части:
        </label>
        <input
          type="file"
          accept="image/gif"
          onChange={handleGifChange}
          style={{
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #444',
            backgroundColor: '#333',
            color: 'white',
            width: '100%'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Настройки:</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={settings.autoCut}
              onChange={(e) => handleSettingChange('autoCut', e.target.checked)}
            />
            <span>✂️ Автонарезка</span>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Формат видео:</label>
          <select
            value={settings.format}
            onChange={(e) => handleSettingChange('format', e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '5px',
              border: '1px solid #444',
              backgroundColor: '#333',
              color: 'white',
              width: '200px'
            }}
          >
            <option value="21:9">21:9 (Ultrawide)</option>
            <option value="16:9">16:9 (Standard)</option>
            <option value="9:16">9:16 (Vertical/TikTok)</option>
            <option value="1:1">1:1 (Square)</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Позиция GIF:</label>
          <select
            value={settings.gifPosition}
            onChange={(e) => handleSettingChange('gifPosition', e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '5px',
              border: '1px solid #444',
              backgroundColor: '#333',
              color: 'white',
              width: '200px'
            }}
          >
            <option value="bottom">Снизу</option>
            <option value="top">Сверху</option>
            <option value="overlay">Наложение</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Качество:</label>
          <select
            value={settings.quality}
            onChange={(e) => handleSettingChange('quality', e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '5px',
              border: '1px solid #444',
              backgroundColor: '#333',
              color: 'white',
              width: '200px'
            }}
          >
            <option value="high">Высокое</option>
            <option value="medium">Среднее</option>
            <option value="low">Низкое</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={processing || !videoFile}
        style={{
          padding: '12px 24px',
          backgroundColor: processing || !videoFile ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: processing || !videoFile ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        {processing ? '⏳ Обработка...' : '🚀 Начать обработку'}
      </button>

      {message && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '5px',
          backgroundColor: message.includes('✅') ? '#28a74520' : '#dc354520',
          border: `1px solid ${message.includes('✅') ? '#28a745' : '#dc3545'}`,
          color: message.includes('✅') ? '#28a745' : '#dc3545'
        }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default VideoEditor
