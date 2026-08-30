// @ts-nocheck
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

window.onerror = function(message, source, lineno, colno, error) {
  alert('Global Crash: ' + message + '\n' + (error?.stack || ''))
}

window.addEventListener('unhandledrejection', function(event) {
  alert('Unhandled Promise Rejection: ' + (event.reason?.message || event.reason))
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
