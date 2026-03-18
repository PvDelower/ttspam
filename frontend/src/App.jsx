import React, { useState } from 'react';
import VideoDownloader from './components/VideoDownloader';
import BannerUpload from './components/BannerUpload';
import TikTokManager from './components/TikTokManager';
import VideoProcessor from './components/VideoProcessor';
import FileManager from './components/FileManager';
import Preview from './components/Preview';
import TikTokAuth from './components/TikTokAuth';
import SchedulePost from './components/SchedulePost';
import AutoSplitTikTok from './components/AutoSplitTikTok';

function App() {
  const [apiBase] = useState(() => {
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      return isLocalhost ? 'http://localhost:8000/api' : '/api';
    }
    return '/api';
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [allFiles, setAllFiles] = useState([]);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>🎬 TikTok Content Manager</h1>
            <p>API: <code>{apiBase}</code></p>
          </div>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* Row 1: Top cards */}
        <div className="top-row">
          <div className="card">
            <VideoDownloader apiBase={apiBase} />
          </div>
          <div className="card">
            <BannerUpload apiBase={apiBase} />
          </div>
          <div className="card">
            <TikTokManager apiBase={apiBase} />
          </div>
          <div className="card">
            <TikTokAuth apiBase={apiBase} />
          </div>
        </div>

        {/* Row 2: Main workspace */}
        <div className="workspace-row">
          <div className="panel files-panel">
            <FileManager
              apiBase={apiBase}
              onFilesRefresh={setAllFiles}
              onFileSelected={setSelectedFile}
            />
          </div>

          <div className="panel preview-panel">
            <Preview fileId={selectedFile} apiBase={apiBase} />
          </div>

          <div className="processor-panel">
            <div className="processor-section">
              <AutoSplitTikTok apiBase={apiBase} selectedVideo={selectedFile || ''} />
            </div>
            <div className="processor-section">
              <VideoProcessor apiBase={apiBase} selectedVideo={selectedFile || ''} />
              <SchedulePost apiBase={apiBase} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Made with 💖 for Deloshera | Backend: Python FastAPI | v3.0</p>
      </footer>
    </div>
  );
}

export default App;
