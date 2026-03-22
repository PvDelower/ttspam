import { useState } from 'react'
import VideoDownloader from './components/VideoDownloader'
import VideoEditor from './components/VideoEditor'
import AccountManager from './components/AccountManager'

function App() {
  const [activeTab, setActiveTab] = useState('downloader')

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>TT Spam - Video Automation</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
        <button 
          onClick={() => setActiveTab('downloader')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'downloader' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📥 Загрузка видео
        </button>
        <button 
          onClick={() => setActiveTab('editor')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'editor' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ✂️ Видеоредактор
        </button>
        <button 
          onClick={() => setActiveTab('accounts')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'accounts' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          👥 Менеджер аккаунтов
        </button>
      </div>

      <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px' }}>
        {activeTab === 'downloader' && <VideoDownloader />}
        {activeTab === 'editor' && <VideoEditor />}
        {activeTab === 'accounts' && <AccountManager />}
      </div>
    </div>
  )
}

export default App
