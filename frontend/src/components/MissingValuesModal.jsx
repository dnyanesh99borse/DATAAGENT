// src/components/MissingValuesModal.jsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Backdrop = styled.div`
  position: fixed; inset: 0; background: rgba(2,6,23,0.45); display:flex; align-items:center; justify-content:center; z-index:3000;
`;
const Card = styled.div`
  width: 920px; max-width:94%; max-height:86vh; overflow:auto;
  background:#fff; border-radius:12px; padding:18px; box-shadow:0 20px 60px rgba(2,6,23,0.35);
`;
const TitleRow = styled.div`display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;`;
const Title = styled.h3`margin:0; font-size:18px;`;
const Close = styled.button`border:none;background:transparent; cursor:pointer; font-weight:700;`;
const Table = styled.div`width:100%; border-top:1px solid #eef2fb;`;
const Row = styled.div`display:flex; gap:12px; align-items:center; padding:10px 6px; border-bottom:1px solid #f3f7fb;`;
const Col = styled.div`flex:1; min-width:0;`;
const ColSmall = styled.div`width:140px; flex:0 0 140px;`;
const Label = styled.div`font-weight:700; color:#0f1724;`;
const Sub = styled.div`font-size:13px; color:#6b7280; margin-top:4px;`;
const Select = styled.select`width:100%; padding:8px 10px; border-radius:8px; border:1px solid #e6eef8;`;
const Input = styled.input`width:100%; padding:8px 10px; border-radius:8px; border:1px solid #e6eef8;`;
const Actions = styled.div`display:flex; gap:10px; justify-content:flex-end; margin-top:12px;`;
const Btn = styled.button`
  padding:8px 12px; border-radius:8px; border:none; cursor:pointer; font-weight:700;
  background:${p => p.primary ? '#0f62fe' : p.warn ? '#ef4444' : '#fff'}; color:${p => p.primary ? '#fff' : p.warn ? '#fff' : '#0f62fe'};
  box-shadow:${p => p.primary ? '0 8px 20px rgba(15,98,254,0.12)' : 'none'};
`;

/*
 Props:
  - open (bool)
  - onClose()
  - columns: string[]
  - rows: object[]
  - onApply(newRows, log, droppedCount)
*/
export default function MissingValuesModal({ open, onClose, columns = [], rows = [], columnBlanks = {}, onApply }) {
  // Always declare hooks in same order
  const [config, setConfig] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [previewSample, setPreviewSample] = useState([]);

  // Reset config when columns change
  useEffect(() => {
    const initial = {};
    columns.forEach(c => { initial[c] = { strategy: 'leave', custom: '' }; });
    setConfig(initial);
    setPreviewMode(false);
    setPreviewSample([]);
  }, [columns]);

  // Helper to check missingness
  const isMissing = (v) => v === null || v === undefined || String(v).trim() === '';

  // Compute simple numeric stats (no hooks)
  function computeStatsForColumn(col) {
    const vals = rows.map(r => r[col]);
    const numeric = vals.map(v => {
      const s = String(v ?? '').replace(/,/g, '');
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }).filter(v => v !== null);
    const mean = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : 0;
    const sorted = numeric.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : 0;
    const modeMap = {};
    for (const v of vals) {
      const k = String(v ?? '');
      modeMap[k] = (modeMap[k] || 0) + 1;
    }
    let mode = '';
    let bestN = 0;
    for (const k of Object.keys(modeMap)) {
      if (modeMap[k] > bestN) { bestN = modeMap[k]; mode = k; }
    }
    const missing = vals.filter(isMissing).length;
    return { mean, median, mode, missing };
  }

  // Build preview rows (first 50) applying config
  function buildPreview() {
    const N = Math.min(50, rows.length);
    const out = [];
    for (let i = 0; i < N; i++) {
      const row = { ...rows[i] };
      for (const col of columns) {
        const conf = config[col] || { strategy: 'leave', custom: '' };
        if (!isMissing(row[col])) continue;
        switch (conf.strategy) {
          case 'zero': row[col] = 0; break;
          case 'mean': row[col] = computeStatsForColumn(col).mean; break;
          case 'median': row[col] = computeStatsForColumn(col).median; break;
          case 'mode': row[col] = computeStatsForColumn(col).mode; break;
          case 'ffill': {
            // try to find previous non-missing value in rows (not preview)
            for (let j = i - 1; j >= 0; --j) {
              const pv = rows[j] && rows[j][col];
              if (!isMissing(pv)) { row[col] = pv; break; }
            }
            break;
          }
          case 'bfill': {
            for (let j = i + 1; j < rows.length; ++j) {
              const nv = rows[j] && rows[j][col];
              if (!isMissing(nv)) { row[col] = nv; break; }
            }
            break;
          }
          case 'custom': row[col] = conf.custom; break;
          case 'drop': /* mark or handle later */ break;
          default: break;
        }
      }
      out.push(row);
    }
    return out;
  }

  // Apply config to full dataset
  function applyConfigToAll() {
    const newRows = [];
    const log = [];
    let droppedCount = 0;

    for (let i = 0; i < rows.length; ++i) {
      const r = rows[i];
      let drop = false;
      const copy = { ...r };
      for (const col of columns) {
        const conf = config[col] || { strategy: 'leave', custom: '' };
        if (!isMissing(copy[col])) continue;
        switch (conf.strategy) {
          case 'leave': break;
          case 'zero':
            copy[col] = 0; log.push({ row: i, col, old: null, new: 0, strategy: 'zero' }); break;
          case 'mean': {
            const v = computeStatsForColumn(col).mean;
            copy[col] = v; log.push({ row: i, col, old: null, new: v, strategy: 'mean' }); break;
          }
          case 'median': {
            const v = computeStatsForColumn(col).median;
            copy[col] = v; log.push({ row: i, col, old: null, new: v, strategy: 'median' }); break;
          }
          case 'mode': {
            const v = computeStatsForColumn(col).mode;
            copy[col] = v; log.push({ row: i, col, old: null, new: v, strategy: 'mode' }); break;
          }
          case 'ffill': {
            let found = null;
            for (let j = i - 1; j >= 0; --j) {
              const pv = rows[j] && rows[j][col];
              if (!isMissing(pv)) { found = pv; break; }
            }
            if (found !== null) { copy[col] = found; log.push({ row: i, col, old: null, new: found, strategy: 'ffill' }); }
            break;
          }
          case 'bfill': {
            let found = null;
            for (let j = i + 1; j < rows.length; ++j) {
              const nv = rows[j] && rows[j][col];
              if (!isMissing(nv)) { found = nv; break; }
            }
            if (found !== null) { copy[col] = found; log.push({ row: i, col, old: null, new: found, strategy: 'bfill' }); }
            break;
          }
          case 'custom':
            copy[col] = conf.custom; log.push({ row: i, col, old: null, new: conf.custom, strategy: 'custom' }); break;
          case 'drop':
            drop = true; break;
          default: break;
        }
        if (drop) break;
      }
      if (!drop) newRows.push(copy); else droppedCount++;
    }

    return { newRows, log, droppedCount };
  }

  // handlers
  function updateStrategy(col, strategy) {
    setConfig(prev => ({ ...prev, [col]: { ...prev[col], strategy } }));
  }
  function updateCustom(col, custom) {
    setConfig(prev => ({ ...prev, [col]: { ...prev[col], custom } }));
  }

  async function handleApply() {
    const { newRows, log, droppedCount } = applyConfigToAll();
    if (onApply) await onApply(newRows, log, droppedCount);
    onClose();
  }

  if (!open) return null;

  // build preview if previewMode
  const previewRows = previewMode ? buildPreview() : [];

  // compute stats per column for UI (not memoized)
  const columnStats = columns.reduce((acc, c) => { acc[c] = computeStatsForColumn(c); return acc; }, {});

  return (
    <Backdrop onClick={onClose}>
      <Card onClick={e => e.stopPropagation()}>
        <TitleRow>
          <Title>Handle missing values — per-column strategies</Title>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Close onClick={onClose}>✕</Close>
          </div>
        </TitleRow>

        <div style={{ color: '#374151', marginBottom: 8 }}>
          Select how to treat missing values per column. Use <strong>Show preview</strong> to inspect results.
        </div>

        <Table>
          <Row style={{ fontWeight: 700, background: '#e7f0faff' }}>
            <ColSmall style={{ width: 140 }}>Column</ColSmall>
            <ColSmall style={{ width: 140 }}>Missing</ColSmall>
            <Col>Stats (mean • median • mode)</Col>
            <ColSmall style={{ width: 140 }}>Strategy</ColSmall>
            <ColSmall style={{ width: 140 }}>Custom</ColSmall>
          </Row>

          {columns.map((c, idx) => {
            const stat = columnStats[c] || { missing: 0, mean: 0, median: 0, mode: '' };
            return (
              <Row key={idx}>
                <ColSmall style={{ width: 140 }}>
                  <Label>{c}</Label>
                </ColSmall>

                <ColSmall style={{ width: 140 }}>
                  <div style={{ fontWeight: 700 }}>{stat.missing}</div>
                  <Sub>empty</Sub>
                </ColSmall>

                <Col>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    mean: {Number.isFinite(stat.mean) ? stat.mean.toFixed(2) : '-'} • median: {Number.isFinite(stat.median) ? stat.median.toFixed(2) : '-'} • mode: {String(stat.mode).slice(0, 20)}
                  </div>
                </Col>

                <ColSmall style={{ width: 140 }}>
                  <Select value={config[c]?.strategy || 'leave'} onChange={(e) => updateStrategy(c, e.target.value)}>
                    <option value="leave">Leave</option>
                    <option value="zero">Fill 0</option>
                    <option value="mean">Fill mean</option>
                    <option value="median">Fill median</option>
                    <option value="mode">Fill mode</option>
                    <option value="ffill">Forward-fill</option>
                    <option value="bfill">Backward-fill</option>
                    <option value="custom">Custom</option>
                    <option value="drop">Drop row</option>
                  </Select>
                </ColSmall>

                <ColSmall style={{ width: 140 }}>
                  {config[c]?.strategy === 'custom' ? (
                    <Input value={config[c].custom || ''} onChange={(e) => updateCustom(c, e.target.value)} placeholder="custom value" />
                  ) : <div style={{ color: '#6b7280', fontSize: 13 }}>—</div>}
                </ColSmall>
              </Row>
            );
          })}
        </Table>

        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
          <label style={{ color: '#6b7280', fontSize: 13 }}>
            <input type="checkbox" checked={previewMode} onChange={() => setPreviewMode(p => !p)} /> Show preview (first 50 rows)
          </label>
        </div>

        {previewMode && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview (applied to first 50 rows)</div>
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eef6ff', borderRadius: 8, padding: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#e7f0faff' }}>
                    {columns.map((c, i) => <th key={i} style={{ padding: 8, borderBottom: '1px solid #eef6ff', textAlign: 'left' }}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, ri) => (
                    <tr key={ri}>
                      {columns.map((c, ci) => {
                        const orig = rows[ri] && rows[ri][c];
                        const after = r[c];
                        const changed = String(orig ?? '') !== String(after ?? '');
                        return <td key={ci} style={{ padding: 8, borderBottom: '1px solid #f3f7fb', background: changed ? 'rgba(255,246,205,0.6)' : 'transparent' }}>{String(after ?? '')}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Actions>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => { setConfig(prev => prev); setPreviewMode(false); }}>Reset</Btn>
          <Btn onClick={handleApply} primary>Apply changes</Btn>
        </Actions>
      </Card>
    </Backdrop>
  );
}
