import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

function boot() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

if (window.App && window.App.core) boot()
else window.addEventListener('load', boot, { once: true })
