import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { CATEGORY_META, REGIME_COLOR, fmt, pct, signed } from '../lib/format';

function Band({ p10, p50, p90, raw, corrected, max = 260 }) {
  const pos = (v) => `${Math.min((Math.max(v, 0) / max) * 100, 100)}%`;
  return (
    <div>
      <div className="band">
        <div className="band-range" style={{ left: pos(p10), width: `${Math.max(((p90 - p10) / max) * 100, 1)}%` }} />
        <div className="band-mid" style={{ left: pos(p50) }} title={`median ${fmt(p50)} mm`} />
        {raw !== undefined && <div className="band-raw" style={{ left: pos(raw) }} title={`raw model ${fmt(raw)} mm`} />}
      </div>
      <div className="band-scale"><span>0</span><span>65</span><span>130</span><span>260 mm</span></div>
    </div>
  );
}

export default function DistrictRail({ districtId, date, lead, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!districtId) { setData(null); return; }
    let alive = true;
    setBusy(true); setError(null);
    api.district(districtId, date, lead)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e.message || e)))
      .finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [districtId, date, lead]);

  if (!districtId) {
    return (
      <div className="panel">
        <div className="panel-head"><span className="panel-title">District detail</span></div>
        <div className="panel-body small muted">
          Select a district on the map or in the table. The rail then shows the corrected
          distribution, the model's regime evidence, the plain-language advisory and the
          Day 1–5 trend — one click, no page change.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-head"><span className="panel-title">District detail</span>
          <button className="btn" onClick={onClose}>close</button></div>
        <div className="panel-body small">Could not load this district: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel">
        <div className="panel-head"><span className="panel-title">District detail</span></div>
        <div className="panel-body"><div className="skeleton" style={{ height: 120 }} /></div>
      </div>
    );
  }

  const cat = CATEGORY_META[data.category];
  const posterior = Object.entries(data.regime_posterior || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 4);
  const trend = data.lead_trend || [];
  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.corrected_mm, t.raw_mm)));

  return (
    <div className="rail">
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">
            {data.district_name}
            <span className="muted small" style={{ marginLeft: 6, fontWeight: 400 }}>{data.state_name}</span>
          </span>
          <div className="cb-group">
            <span className={`cat-chip cat-${data.category}`} title={`${cat.label} — ${cat.action}`}>{cat.short}</span>
            <button className="btn" onClick={onClose} title="close panel (Esc)">✕</button>
          </div>
        </div>
        <div className="panel-body">
          <div className="summary-strip" style={{ border: 0, marginBottom: 8 }}>
            <div className="stat">
              <div className="k">Corrected (Day {lead})</div>
              <div className="v">{fmt(data.corrected_mm)}<span className="u"> mm</span></div>
            </div>
            <div className="stat">
              <div className="k">Raw model</div>
              <div className="v" style={{ color: 'var(--muted)' }}>{fmt(data.raw_mm)}<span className="u"> mm</span></div>
            </div>
            <div className="stat">
              <div className="k">Correction</div>
              <div className="v">{signed(data.adjustment_mm)}<span className="u"> mm</span></div>
            </div>
          </div>

          <div className="small muted" style={{ marginBottom: 4 }}>
            Predictive distribution — band is P10–P90, line is the median, red tick is the raw model
          </div>
          <Band p10={data.p10_mm} p50={data.p50_mm} p90={data.p90_mm} raw={data.raw_mm} />

          <dl className="kv" style={{ marginTop: 10 }}>
            <dt>P(≥ 64.5 mm)</dt><dd>{pct(data.p_heavy, 0)}</dd>
            <dt>P(≥ 115.6 mm)</dt><dd>{pct(data.p_very_heavy, 0)}</dd>
            <dt>P(≥ 204.5 mm)</dt><dd>{pct(data.p_extremely_heavy, 0)}</dd>
            <dt>Observed (reference)</dt><dd>{fmt(data.reference_observed_max_mm)} mm</dd>
            <dt>Elevation</dt><dd>{fmt(data.elevation_m, 0)} m</dd>
            <dt>Zone</dt><dd>{data.zone}</dd>
          </dl>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Why this correction — regime evidence</span>
        </div>
        <div className="panel-body">
          {posterior.map(([name, p]) => (
            <div key={name} className="bar-row" style={{ marginBottom: 4 }}>
              <span className="small" style={{ color: REGIME_COLOR[name] || undefined }}>{name}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${p * 100}%`, background: REGIME_COLOR[name] }} />
              </div>
              <span className="num small">{pct(p, 0)}</span>
            </div>
          ))}
          <div className="tiny muted" style={{ marginTop: 6 }}>
            The correction model receives these posteriors together with the dynamical fields, so the
            same raw rainfall can be corrected differently on a depression day than on a break day.
            No black-box text explanation: this is the actual model input.
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Advisory issued for this district</span></div>
        <div className="panel-body">
          <div className={`advisory${data.category === 'yellow' ? ' hi' : ''}`}>
            <div><b>{data.advisory.alert_label_en}</b> · {cat.action}</div>
            <div className="small" style={{ marginTop: 4 }}>{data.advisory.advisory_text_en}</div>
            <ul className="small" style={{ margin: '6px 0 0 16px', padding: 0 }}>
              {(data.advisory.recommended_actions || []).slice(0, 4).map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
          {data.advisory.advisory_text_hi && (
            <div className="advisory hi" style={{ marginTop: 6 }}>
              <div className="small">{data.advisory.advisory_text_hi}</div>
            </div>
          )}
          <div className="tiny muted" style={{ marginTop: 6 }}>
            CAP alert identifier: <span className="mono">{data.cap_alert?.identifier || '—'}</span> ·
            severity <span className="mono">{data.cap_alert?.severity || '—'}</span> ·
            urgency <span className="mono">{data.cap_alert?.urgency || '—'}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Day 1–5 consistency</span>
          <span className="tiny muted">does the signal survive the forecast horizon?</span>
        </div>
        <div className="panel-body">
          {trend.map((t) => (
            <div key={t.lead} className="bar-row" style={{ marginBottom: 5, gridTemplateColumns: '46px 1fr 96px' }}>
              <span className="small">Day {t.lead}</span>
              <div>
                <div className="bar-track" style={{ marginBottom: 2 }}>
                  <div className="bar-fill" style={{ width: `${(t.corrected_mm / maxTrend) * 100}%` }} />
                </div>
                <div className="bar-track">
                  <div className="bar-fill alt" style={{ width: `${(t.raw_mm / maxTrend) * 100}%` }} />
                </div>
              </div>
              <span className="num small">
                {fmt(t.corrected_mm)} / {fmt(t.raw_mm)} mm<br />
                <span className="muted tiny">P90 {fmt(t.p90_mm, 0)} · P {pct(t.p_heavy, 0)}</span>
              </span>
            </div>
          ))}
          <div className="tiny muted">dark bar = corrected, grey bar = raw model</div>
        </div>
      </div>
    </div>
  );
}
