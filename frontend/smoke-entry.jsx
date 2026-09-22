// Entry point used only by the jsdom smoke test (see scripts/smoke.mjs).
import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './src/App.jsx';

export async function mount(el) {
  createRoot(el).render(React.createElement(App));
}
