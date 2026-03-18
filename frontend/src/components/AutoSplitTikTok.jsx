import React, { useState, useEffect } from 'react';
import InlineVideoPlayer from './InlineVideoPlayer';

/**
 * Автонарезка видео для TikTok: по N минут, эффект зеркало, гифка/баннер снизу.
 */
export default function AutoSplitTikTok({ apiBase = '/api', selectedVideo: selectedVideoProp = '' }) {
  const [videos, setVideos] = useState([]);
  const [banners, setBanners] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(selectedVideoProp || '');
  const [segmentMinutes, setSegmentMinutes] = useState(10);
  const [effect, setEffect] = useState('mirror'); // mirror | none
  const [selectedBanner, setSelectedBanner] = useState('');
  const [style, setStyle] = useState('tiktok_blur'); // default | tiktok_blur
  const [gifNoBackground, setGifNoBackground] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [playingSegmentFile, setPlayingSegmentFile] = useState('');

  useEffect(() => {
    loadVideos();
    loadBanners();
  }, []);

  useEffect(() => {
    if (selectedVideoProp) setSelectedVideo(selectedVideoProp);
  }, [selectedVideoProp]);

  const loadVideos = async () => {
    try {
      const res = await fetch(`${apiBase}/files?directory=downloads`);
      const data = await res.json();
      setVideos(data.files || []);
    } catch (e) {
      console.error('Load videos:', e);
    }
  };

  const loadBanners = async () => {
    try {
      const res = await fetch(`${apiBase}/banners`);
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (e) {
      console.error('Load banners:', e);
    }
  };

  const handleSplit = async (e) => {
    e.preventDefault();
    if (!selectedVideo) {
      setError('Выбери видео для нарезки');
      return;
    }
    if (segmentMinutes < 1 || segmentMinutes > 60) {
      setError('Длина сегмента: от 1 до 60 минут');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        input_file: selectedVideo,
        segment_duration_minutes: Number(segmentMinutes),
        effect: effect,
        banner_file: selectedBanner || null,
        style: style,
        gif_no_background: gifNoBackground,
      };

      const res = await fetch(`${apiBase}/process/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка нарезки');

      setResult(data);
      if (data.segments && data.segments.length > 0) {
        setPlayingSegmentFile(data.segments[0].filename);
      }
      setTimeout(loadVideos, 1000);
    } catch (err) {
      setError(err.message || 'Ошибка нарезки');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 212, 255, 0.15)',
  };

  const labelStyle = { color: '#94a3b8', fontSize: '13px', fontWeight: '600', marginBottom: '6px' };
  const inputStyle = {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: '14px',
    width: '100%',
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8', fontSize: '18px' }}>
        ✂️ Автонарезка для TikTok
      </h3>
      <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '16px' }}>
        Серия 40 мин → по {segmentMinutes} мин, формат 9:16, гифка снизу, эффект зеркало
      </p>

      {error && (
        <div style={{ padding: '10px', background: '#7f1d1d', color: '#fecaca', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      {result && (
        <>
          <div style={{ padding: '12px', background: '#064e3b', color: '#6ee7b7', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' }}>
            ✅ Создано {result.total_segments} сегментов по {result.segment_duration_minutes} мин.
            {result.with_banner && ' С баннером снизу.'}
          </div>

          <div
            style={{
              marginBottom: '16px',
              padding: '14px',
              background: '#0f172a',
              borderRadius: '10px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
              ▶️ Просмотр нарезки
            </div>
            {result.segments && result.segments.length > 0 && (
              <>
                <select
                  value={playingSegmentFile}
                  onChange={(e) => setPlayingSegmentFile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: '10px',
                    background: '#1e293b',
                    color: '#e2e8f0',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {result.segments.map((seg) => (
                    <option key={seg.filename} value={seg.filename}>
                      Сегмент {seg.segment} — {seg.filename}
                    </option>
                  ))}
                </select>
                <InlineVideoPlayer
                  apiBase={apiBase}
                  fileName={playingSegmentFile || result.segments[0].filename}
                  title=""
                />
              </>
            )}
          </div>
        </>
      )}

      <form onSubmit={handleSplit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>📹 Видео (из загрузок)</label>
          <select
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
            style={selectStyle}
          >
            <option value="">-- Выбери видео --</option>
            {videos.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name} ({(v.size / 1024 / 1024).toFixed(1)} MB)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>⏱ Длина одного ролика (минуты)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={segmentMinutes}
            onChange={(e) => setSegmentMinutes(Number(e.target.value) || 10)}
            style={{ ...inputStyle, maxWidth: '120px' }}
          />
        </div>

        <div>
          <label style={labelStyle}>🎞️ Стиль сегментов</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} style={selectStyle}>
            <option value="default">Обычный (растяжение + баннер)</option>
            <option value="tiktok_blur">TikTok: размытые полосы + гифка внизу</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>🪞 Эффект</label>
          <select value={effect} onChange={(e) => setEffect(e.target.value)} style={selectStyle}>
            <option value="mirror">Зеркало (hflip)</option>
            <option value="none">Без эффекта</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>🎬 Гифка/баннер снизу (опционально)</label>
          <select
            value={selectedBanner}
            onChange={(e) => setSelectedBanner(e.target.value)}
            style={selectStyle}
          >
            <option value="">-- Без баннера --</option>
            {banners.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {style === 'tiktok_blur' && selectedBanner && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={gifNoBackground}
              onChange={(e) => setGifNoBackground(e.target.checked)}
            />
            Гифка без фона: основной ролик растянут вниз, гифка сверху (оверлей с прозрачностью)
          </label>
        )}

        <button
          type="submit"
          disabled={loading || !selectedVideo}
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            background: loading ? '#475569' : 'linear-gradient(90deg, #0ea5e9, #06b6d4)',
            color: '#fff',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: !selectedVideo ? 0.6 : 1,
          }}
        >
          {loading ? '⏳ Нарезаю...' : '✂️ Нарезать под TikTok'}
        </button>
      </form>
    </div>
  );
}
