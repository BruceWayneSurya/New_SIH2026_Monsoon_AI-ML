import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import Today from './components/Today';
import SkillLab from './components/verification/SkillLab';
import Method from './components/verification/Method';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'skill', label: 'Skill lab' },
  { id: 'method', label: 'Method' },
];

function readHash() {
  const h = window.location.hash.replace(/^#/, '');
  const [tab, date, lead] = h.split('/');
  return {
    tab: TABS.some((t) => t.id === tab) ? tab : 'today',
    date: /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : null,
    lead: /^[1-5]$/.test(lead || '') ? Number(lead) : 1,
  };
}

export default function App() {
  const initial = useMemo(readHash, []);
  const [tab, setTab] = useState(initial.tab);
  const [session, setSession] = useState({ date: initial.date, lead: initial.lead });
  const [health, setHealth] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { api.health().then(setHealth).catch(() => setHealth(null)); }, []);

  // The hash is the shareable link: #today/2019-07-26/3 opens that view directly.
  useEffect(() => {
    const next = `#${tab}${session.date ? `/${session.date}/${session.lead}` : ''}`;
    if (window.location.hash !== next) window.history.replaceState(null, '', next);
  }, [tab, session]);

  useEffect(() => {
    const onHash = () => {
      const h = readHash();
      setTab(h.tab);
      setSession((s) => ({ ...s, date: h.date || s.date, lead: h.lead }));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const onSession = useCallback((patch) => setSession((s) => ({ ...s, ...patch })), []);

  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (typing) return;
      if (e.key === '?') setToast('Shortcuts: ← → days · 1-5 lead · n/p significant day · l map layer · b bulletin · s story mode');
      if (e.key === 'l') {
        window.dispatchEvent(new CustomEvent('monsooniq:cycle-layer'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const freshness = health?.loaded_utc;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <span className="brand-mark">MonsoonIQ</span>
            <span className="brand-sub">
              Regime-aware post-processing of NWP rainfall · IMD warning scale
            </span>
          </div>
          <div className="cb-group" style={{ marginLeft: 12 }}>
            <span className={`chip${health?.provenance?.includes('SYNTHETIC') ? ' warn' : ''}`}
                  title={health ? JSON.stringify(health.artifacts) : ''}>
              <span className="dot" style={{ background: health?.status === 'healthy' ? '#1c7c3f' : '#b07d00' }} />
              {health?.status === 'healthy' ? 'Engine ready' : 'Engine degraded'}
            </span>
            <span className="chip" title="data provenance — synthetic archive, not live IMD data">
              {health?.provenance === 'SYNTHETIC_PHYSICALLY_PLAUSIBLE'
                ? 'Provenance: synthetic research archive'
                : `Provenance: ${health?.provenance || 'unknown'}`}
            </span>
            {freshness && <span className="chip">Models loaded {freshness}</span>}
          </div>
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </nav>
        </div>
      </header>

      {tab === 'today' && (
        <Today session={session} onSession={onSession} onToast={setToast} onTab={setTab} />
      )}
      {tab === 'skill' && <SkillLab />}
      {tab === 'method' && <Method />}

      <footer className="footer">
        Research prototype. Forecast fields are produced by a synthetic physically-plausible archive
        generated inside this repository and are <b>not</b> official IMD/NCMRWF products; do not use for
        public warnings. Verification figures are internal comparisons on that archive.
        {' '}Press <span className="mono">?</span> for shortcuts.
      </footer>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)',
          background: '#101820', color: '#fff', padding: '8px 14px', borderRadius: 4,
          fontSize: 12.5, zIndex: 1500, maxWidth: '90vw',
        }}>{toast}</div>
      )}
    </div>
  );
}
