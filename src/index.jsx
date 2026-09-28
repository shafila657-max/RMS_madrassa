import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Older versions of the app kept Supabase API responses in this cache. Remove it so
// no private data lingers and no stale answers are served.
if (typeof window !== 'undefined' && 'caches' in window) {
    window.caches.delete('supabase-cache').catch(() => {});
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
