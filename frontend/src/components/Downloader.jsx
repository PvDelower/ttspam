import React, { useState } from 'react';

function Downloader({ onFileSelected }) {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const handleDownload = async () => {
    if (!url.trim()) {
      setMessage('❌ Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setMessage('⏳ Downloading...');

    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality })
      });

      const data = await res.json();

      if (data.status === 'success') {
        setMessage(`✅ Downloaded: ${data.data.filename}`);
        onFileSelected(data.data.file_id);
        setUrl('');
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (e) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-content">
      <h2>📥 Download Video</h2>

      <div className="form-group">
        <label>YouTube URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Quality</label>
        <select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={loading}>
          <option value="best">🟢 Best</option>
          <option value="720">720p</option>
          <option value="480">480p</option>
          <option value="360">360p</option>
        </select>
      </div>

      <button
        onClick={handleDownload}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? '⏳ Downloading...' : '🚀 Download'}
      </button>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default Downloader;