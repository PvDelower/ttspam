import { useState } from 'react'

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
      const response = await fetch('http://localhost:8000/api/edit', {
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
      setMessage(`❌ Ошибка соединения: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <h2>✂️ Видеоредактор</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Настройте параметры обработки видео: автонарезка, добавление гифки, формат 21:9
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h3>1. Загрузите видео</h3>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            style={{
              padding: '12px',
              backgroundColor: '#333',
              color: 'white',
              borderRadius: '5px',
              border: '1px solid #444',
              width: '100%'
            }}
          />
          {videoFile && (
            <div style={{ marginTop: '10px', color: '#28a745', fontSize: '14px' }}>
              ✓ {videoFile.name}
            </div>
          )}
        </div>

        <div>
          <h3>2. Загрузите GIF (опционально)</h3>
          <input
            type="file"
            accept="image/gif"
            onChange={handleGifChange}
            style={{
              padding: '12px',
              backgroundColor: '#333',
              color: 'white',
              borderRadius: '5px',
              border: '1px solid #444',
              width: '100%'
            }}
          />
          {gifFile && (
            <div style={{ marginTop: '10px', color: '#28a745', fontSize: '14px' }}>
              ✓ {gifFile.name}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>3. Настройки обработки</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.autoCut}
                onChange={(e) => handleSettingChange('autoCut', e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>✂️ Автонарезка видео</span>
            </label>
          </div>

          <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '5px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>📐 Формат видео:</label>
            <select
              value={settings.format}
              onChange={(e) => handleSettingChange('format', e.target.value)}
              style={{
                padding: '8px',
                backgroundColor: '#444',
                color: 'white',
                borderRadius: '5px',
                border: 'none',
                width: '100%'
              }}
            >
              <option value="21:9">21:9 (Ultrawide)</option>
              <option value="16:9">16:9 (Standard)</option>
              <option value="9:16">9:16 (Vertical/TikTok)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>

          <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '5px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>📍 Позиция GIF:</label>
            <select
              value={settings.gifPosition}
              onChange={(e) => handleSettingChange('gifPosition', e.target.value)}
              style={{
                padding: '8px',
                backgroundColor: '#444',
                color: 'white',
                borderRadius: '5px',
                border: 'none',
                width: '100%'
              }}
            >
              <option value="bottom">Внизу</option>
              <option value="top">Вверху</option>
              <option value="left">Слева</option>
              <option value="right">Справа</option>
            </select>
          </div>

          <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '5px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>🎬 Качество:</label>
            <select
              value={settings.quality}
              onChange={(e) => handleSettingChange('quality', e.target.value)}
              style={{
                padding: '8px',
                backgroundColor: '#444',
                color: 'white',
                borderRadius: '5px',
                border: 'none',
                width: '100%'
              }}
            >
              <option value="high">Высокое (1080p)</option>
              <option value="medium">Среднее (720p)</option>
              <option value="low">Низкое (480p)</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={processing || !videoFile}
        style={{
          padding: '15px 30px',
          backgroundColor: (processing || !videoFile) ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: (processing || !videoFile) ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '16px',
          width: '100%'
        }}
      >
        {processing ? '⏳ Обработка...' : '🚀 Начать обработку'}
      </button>

      {message && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '5px',
          backgroundColor: message.includes('✅') ? '#28a74520' : (message.includes('❌') ? '#dc354520' : '#ffc10720'),
          border: `1px solid ${message.includes('✅') ? '#28a745' : (message.includes('❌') ? '#dc3545' : '#ffc107')}`,
          color: message.includes('✅') ? '#28a745' : (message.includes('❌') ? '#dc3545' : '#ffc107')
        }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default VideoEditor
