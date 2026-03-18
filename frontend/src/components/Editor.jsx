import React, { useState } from 'react';

function Editor({ selectedFile }) {
  const [effects, setEffects] = useState({
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    speed: 1.0,
    blur: 0,
    rotate: 0
  });

  const [banner, setBanner] = useState({
    enabled: false,
    text: 'My Channel',
    position: 'bottom',
    color: 'FFFFFF',
    opacity: 0.9,
    height: 0.15
  });

  const [trim, setTrim] = useState({
    start: 0,
    end: null
  });
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEffectChange = (key, value) => {
    setEffects(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  const handleBannerChange = (key, value) => {
    setBanner(prev => ({
      ...prev,
      [key]: key === 'enabled' ? !prev[key] : value
    }));
  };

  const handleTrimChange = (key, value) => {
    setTrim(prev => ({
      ...prev,
      [key]: value ? parseFloat(value) : null
    }));
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      setMessage('❌ Please select a file first');
      return;
    }

    setLoading(true);
    setMessage('⏳ Processing...');

    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: selectedFile,
          effects,
          banner,
          trim: trim.start > 0 || trim.end ? trim : null
        })
      });

      const data = await res.json();

      if (data.status === 'success') {
        setMessage(`✅ Processed: ${data.data.filename}`);
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
    <div className="panel-content editor-content">
      <h2>🎨 Effects & Editor</h2>

      {/* Effects Section */}
      <div className="section">
        <h3>✨ Visual Effects</h3>
        
        <div className="slider-group">
          <label>Brightness: {effects.brightness.toFixed(2)}</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={effects.brightness}
            onChange={(e) => handleEffectChange('brightness', e.target.value)}
          />
        </div>

        <div className="slider-group">
          <label>Contrast: {effects.contrast.toFixed(2)}</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={effects.contrast}
            onChange={(e) => handleEffectChange('contrast', e.target.value)}
          />
        </div>

        <div className="slider-group">
          <label>Saturation: {effects.saturation.toFixed(2)}</label>
          <input
            type="range"
            min="0.0"
            max="2.0"
            step="0.1"
            value={effects.saturation}
            onChange={(e) => handleEffectChange('saturation', e.target.value)}
          />
        </div>

        <div className="slider-group">
          <label>Speed: {effects.speed.toFixed(2)}x</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={effects.speed}
            onChange={(e) => handleEffectChange('speed', e.target.value)}
          />
        </div>

        <div className="slider-group">
          <label>Blur: {effects.blur}</label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={effects.blur}
            onChange={(e) => handleEffectChange('blur', e.target.value)}
          />
        </div>

        <div className="slider-group">
          <label>Rotate: {effects.rotate}°</label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={effects.rotate}
            onChange={(e) => handleEffectChange('rotate', e.target.value)}
          />
        </div>
      </div>

      {/* Banner Section */}
      <div className="section">
        <h3>🖼️ Banner/Watermark</h3>
        
        <label className="checkbox-group">
          <input
            type="checkbox"
            checked={banner.enabled}
            onChange={() => handleBannerChange('enabled', null)}
          />
          Enable Banner
        </label>

        {banner.enabled && (
          <>
            <div className="form-group">
              <label>Text</label>
              <input
                type="text"
                value={banner.text}
                onChange={(e) => handleBannerChange('text', e.target.value)}
                maxLength="30"
              />
            </div>

            <div className="form-group">
              <label>Position</label>
              <select value={banner.position} onChange={(e) => handleBannerChange('position', e.target.value)}>
                <option value="top">⬆️ Top</option>
                <option value="center">⚪ Center</option>
                <option value="bottom">⬇️ Bottom</option>
              </select>
            </div>

            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                defaultValue="#FFFFFF"
                onChange={(e) => handleBannerChange('color', e.target.value.substring(1))}
              />
            </div>

            <div className="slider-group">
              <label>Opacity: {(banner.opacity * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={banner.opacity}
                onChange={(e) => handleBannerChange('opacity', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {/* Trim Section */}
      <div className="section">
        <h3>✂️ Trim Video</h3>
        
        <div className="form-group">
          <label>Start (seconds)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={trim.start}
            onChange={(e) => handleTrimChange('start', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>End (seconds)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="Leave empty for full duration"
            onChange={(e) => handleTrimChange('end', e.target.value)}
          />
        </div>
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={loading || !selectedFile}
        className="btn btn-primary btn-large"
      >
        {loading ? '⏳ Processing...' : '🎬 Process Video'}
      </button>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default Editor;