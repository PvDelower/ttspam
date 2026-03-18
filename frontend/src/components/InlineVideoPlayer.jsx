import React from 'react';

/**
 * URL для стриминга видео с бэкенда (outputs или downloads).
 */
export function getVideoStreamUrl(apiBase, filename) {
  if (!filename) return null;
  const encoded = encodeURIComponent(filename);
  if (apiBase && apiBase.startsWith('http')) {
    const base = apiBase.replace(/\/api\/?$/, '');
    return `${base}/download/${encoded}`;
  }
  return `/download/${encoded}`;
}

/**
 * Плеер для просмотра обработанного видео прямо на сайте.
 */
export default function InlineVideoPlayer({ apiBase = '/api', fileName, title = 'Просмотр' }) {
  const src = getVideoStreamUrl(apiBase, fileName);
  if (!fileName || !src) return null;

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
      }}
    >
      {title && (
        <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
          ▶️ {title}
        </div>
      )}
      <video
        src={src}
        controls
        playsInline
        style={{
          width: '100%',
          maxHeight: '360px',
          borderRadius: '6px',
          background: '#000',
        }}
      />
      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>
        {fileName}
      </p>
    </div>
  );
}
