import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [sourceFileId, setSourceFileId] = useState('');
  const [clipLengthSec, setClipLengthSec] = useState('60');
  const [cronExpression, setCronExpression] = useState('0 0 * * *');
  const [tiktokAutoUpload, setTiktokAutoUpload] = useState(false);
  const [tiktokAccountId, setTiktokAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    loadSchedules();
    loadAccounts();
  }, []);

  const loadSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/schedule`);
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (e) {
      console.error('Load schedules error:', e);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tiktok/accounts`);
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error('Load accounts error:', e);
    }
  };

  const handleCreateSchedule = async () => {
    if (!sourceFileId || !clipLengthSec || !cronExpression) {
      setMessage('❌ Заполни все обязательные поля');
      return;
    }

    setCreating(true);
    setMessage('⏳ Создание расписания...');

    const payload = {
      source_file_id: sourceFileId,
      clip_length_sec: parseInt(clipLengthSec),
      cron: cronExpression,
      tiktok_auto_upload: tiktokAutoUpload,
      tiktok_account_id: tiktokAutoUpload ? tiktokAccountId : null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/schedule/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setMessage(`✅ Расписание создано: ${data.schedule_id}`);
        setSourceFileId('');
        setClipLengthSec('60');
        setCronExpression('0 0 * * *');
        setTiktokAutoUpload(false);
        setTiktokAccountId('');
        loadSchedules();
      } else {
        setMessage(`❌ Ошибка: ${data.detail}`);
      }
    } catch (e) {
      setMessage(`❌ Ошибка: ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Удалить расписание?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/schedule/${scheduleId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.status === 'success') {
        setMessage('✅ Расписание удалено');
        loadSchedules();
      } else {
        setMessage(`❌ Ошибка: ${data.detail}`);
      }
    } catch (e) {
      setMessage(`❌ Ошибка: ${e.message}`);
    }
  };

  const cronExamples = [
    { label: 'Каждый день в 00:00', value: '0 0 * * *' },
    { label: 'Каждый день в 12:00', value: '0 12 * * *' },
    { label: 'Каждый понедельник', value: '0 0 * * 1' },
    { label: 'Каждый час', value: '0 * * * *' },
    { label: 'Каждые 30 минут', value: '*/30 * * * *' },
    { label: 'По будням в 9:00', value: '0 9 * * 1-5' },
  ];

  return (
    <div
      style={{
        padding: '20px',
        background: '#1a1a1a',
        color: '#fff',
        borderRadius: '8px',
        border: '1px solid #333',
      }}
    >
      <h3 style={{ marginTop: 0 }}>⏰ Менеджер Расписания</h3>

      {message && (
        <div
          style={{
            marginBottom: '15px',
            padding: '10px',
            background: message.includes('✅') ? '#1a3a1a' : '#3a1a1a',
            color: message.includes('✅') ? '#4ade80' : '#ff6b6b',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#0a0a0a',
          borderRadius: '8px',
          border: '1px solid #333',
        }}
      >
        <h4 style={{ marginTop: 0 }}>➕ Создать Расписание</h4>

        <label style={{ display: 'block', marginBottom: '15px' }}>
          📹 Путь до видеофайла (например, /home/user/video.mp4):
          <input
            type="text"
            value={sourceFileId}
            onChange={(e) => setSourceFileId(e.target.value)}
            placeholder="/path/to/video.mp4"
            style={{
              width: '100%',
              padding: '10px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              marginTop: '5px',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '15px' }}>
          ⏱️ Длина клипа (секунды):
          <input
            type="number"
            value={clipLengthSec}
            onChange={(e) => setClipLengthSec(e.target.value)}
            min="10"
            max="600"
            style={{
              width: '100%',
              padding: '10px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              marginTop: '5px',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '15px' }}>
          🕐 Cron выражение:
          <select
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              marginTop: '5px',
              marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          >
            {cronExamples.map((ex) => (
              <option key={ex.value} value={ex.value}>
                {ex.label} ({ex.value})
              </option>
            ))}
          </select>
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="0 0 * * *"
            style={{
              width: '100%',
              padding: '10px',
              background: '#2a2a2a',
              color: '#888',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '12px',
              boxSizing: 'border-box',
            }}
          />
          <small style={{ color: '#888', marginTop: '5px', display: 'block' }}>
            Формат: мин час день месяц день_недели
          </small>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={tiktokAutoUpload}
            onChange={(e) => setTiktokAutoUpload(e.target.checked)}
            style={{ marginRight: '10px', cursor: 'pointer' }}
          />
          <span>🎵 Автоматически загружать в TikTok</span>
        </label>

        {tiktokAutoUpload && (
          <label style={{ display: 'block', marginBottom: '15px' }}>
            📝 Аккаунт TikTok:
            <select
              value={tiktokAccountId}
              onChange={(e) => setTiktokAccountId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                marginTop: '5px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">-- Выбрать аккаунт --</option>
              {accounts.map((acc) => (
                <option key={acc.account_id} value={acc.account_id}>
                  {acc.account_name}
                  {acc.nickname ? ` (@${acc.nickname})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={handleCreateSchedule}
          disabled={creating}
          style={{
            width: '100%',
            padding: '12px',
            background: '#38BDF8',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: creating ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? '⏳ Создаю...' : '✅ Создать Расписание'}
        </button>
      </div>

      <div>
        <h4>📋 Активные Расписания ({schedules.length})</h4>

        {schedules.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>
            Нет активных расписаний
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '10px',
            }}
          >
            {schedules.map((schedule) => (
              <div
                key={schedule.schedule_id}
                style={{
                  padding: '15px',
                  background: '#0a0a0a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ color: '#38BDF8', fontWeight: 'bold' }}>
                    {schedule.schedule_id}
                  </div>
                  <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                    Создано:{' '}
                    {new Date(schedule.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div>📹 {schedule.source_file_id}</div>
                  <div>⏱️ Клип: {schedule.clip_length_sec} сек</div>
                  <div>🕐 Cron: {schedule.cron}</div>
                  {schedule.tiktok_auto_upload && (
                    <div style={{ color: '#4ade80' }}>
                      ✅ Автозагрузка TikTok: {schedule.tiktok_account_id}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#ff6b6b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}
                >
                  🗑️ Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
