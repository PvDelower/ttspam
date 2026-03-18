import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Обработка ошибок на уровне приложения
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Можно добавить отправку отчета об ошибке на сервер
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
