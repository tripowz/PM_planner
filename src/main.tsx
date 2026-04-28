import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      closeButton
      duration={3000}
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-secondary)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-panel)',
        },
      }}
    />
  </React.StrictMode>,
)
