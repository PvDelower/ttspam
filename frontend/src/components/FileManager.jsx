import React, { useState, useEffect } from 'react';

function FileManager({ onFilesRefresh, onFileSelected, apiBase }) {
  const [downloads, setDownloads] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('downloads');
  const [error, setError] = useState('');

  // Нормализация apiBase
  const API_BASE = apiBase || 'http://localhost:8000/api';

  useEffect(() => {
    refreshFiles();
    // Автообновление каждые 5 секунд
    const interval = setInterval(refreshFiles, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshFiles = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Загружаем downloads
      const resDl = await fetch(
        `${API_BASE}/files?directory=downloads`,
        { cache: 'no-store' }
      );
      
      if (!resDl.ok) {
        throw new Error(`Downloads: HTTP ${resDl.status}`);
      }
      
      const dlData = await resDl.json();

      // Загружаем outputs
      const resOut = await fetch(
        `${API_BASE}/files?directory=outputs`,
        { cache: 'no-store' }
      );
      
      if (!resOut.ok) {
        throw new Error(`Outputs: HTTP ${resOut.status}`);
      }
      
      const outData = await resOut.json();

      const downloadsList = dlData.files || [];
      const outputsList = outData.files || [];
      
      setDownloads(downloadsList);
      setOutputs(outputsList);
      
      if (onFilesRefresh) {
        onFilesRefresh([...downloadsList, ...outputsList]);
      }
    } catch (e) {
      console.error('Files refresh error:', e);
      setError(`⚠️ Ошибка загрузки: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId, isOutput) => {
    if (!window.confirm(`Удалить файл "${fileId}"?`)) return;

    try {
      const directory = isOutput ? 'outputs' : 'downloads';
      const res = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();

      if (data.status === 'success' || res.ok) {
        refreshFiles();
        // Если файл был выбран, сбрасываем выбор
        if (onFileSelected) {
          onFileSelected(null);
        }
      } else {
        throw new Error(data.detail || 'Delete failed');
      }
    } catch (e) {
      alert(`❌ Ошибка удаления: ${e.message}`);
    }
  };

  const handleDownload = async (fileId) => {
    try {
      // Открываем файл для скачивания/просмотра
      window.open(`${API_BASE}/download-file/${fileId}`, '_blank');
    } catch (e) {
      alert(`❌ Ошибка скачивания: ${e.message}`);
    }
  };

  const handleSelect = (fileId) => {
    if (onFileSelected) {
      onFileSelected(fileId);
    }
  };

  const files = activeTab === 'downloads' ? downloads : outputs;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📁 Файловый менеджер</h2>
        <button 
          onClick={refreshFiles} 
          disabled={loading}
          style={styles.refreshButton}
        >
          🔄 {loading ? '...' : ''}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          className={activeTab === 'downloads' ? 'active' : ''}
          onClick={() => setActiveTab('downloads')}
          style={{
            ...styles.tab,
            ...(activeTab === 'downloads' ? styles.activeTab : {}),
          }}
        >
          📥 Downloads ({downloads.length})
        </button>
        <button
          className={activeTab === 'outputs' ? 'active' : ''}
          onClick={() => setActiveTab('outputs')}
          style={{
            ...styles.tab,
            ...(activeTab === 'outputs' ? styles.activeTab : {}),
          }}
        >
          📤 Outputs ({outputs.length})
        </button>
      </div>

      {/* File List */}
      <div style={styles.fileList}>
        {files.length === 0 ? (
          <div style={styles.empty}>
            📭 Нет файлов в этой папке
          </div>
        ) : (
          files.map((file) => (
            <div key={file.name} style={styles.fileItem}>
              <div style={styles.fileInfo} onClick={() => handleSelect(file.name)}>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileMeta}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
              <div style={styles.fileActions}>
                <button
                  onClick={() => handleSelect(file.name)}
                  style={styles.actionButton}
                  title="Выбрать"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDownload(file.name)}
                  style={styles.actionButton}
                  title="Скачать"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleDelete(file.name, activeTab === 'outputs')}
                  style={{...styles.actionButton, ...styles.deleteButton}}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexShrink: 0,
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '18px',
  },
  refreshButton: {
    padding: '6px 12px',
    background: '#2a2a2a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  error: {
    padding: '8px 12px',
    borderRadius: '4px',
    background: '#3a1a1a',
    color: '#ff6b6b',
    marginBottom: '12px',
    fontSize: '13px',
    border: '1px solid #ef4444',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    background: 'transparent',
    color: '#888',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    background: '#2a2a2a',
    color: '#fff',
    borderColor: '#38BDF8',
  },
  fileList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '4px',
    minHeight: 0,
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    padding: '30px 20px',
    fontSize: '14px',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #333',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    cursor: 'pointer',
    overflow: 'hidden',
  },
  fileName: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '4px',
    wordBreak: 'break-all',
  },
  fileMeta: {
    color: '#888',
    fontSize: '12px',
  },
  fileActions: {
    display: 'flex',
    gap: '6px',
    marginLeft: '10px',
    flexShrink: 0,
  },
  actionButton: {
    padding: '6px 10px',
    background: '#1a1a1a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  deleteButton: {
    background: '#3a1a1a',
    borderColor: '#ef4444',
  },
};

export default FileManager;
