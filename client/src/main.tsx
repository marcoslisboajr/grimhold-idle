import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { UpdateBanner } from './UpdateBanner.tsx';
import './style.css';
import { applyFont } from './fontPref.ts';

applyFont();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <UpdateBanner />
  </StrictMode>,
);
