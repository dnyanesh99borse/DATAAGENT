// src/pages/DBConnection.jsx
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

/**
 * Frontend-only DBConnection
 * - Removes all backend calls.
 * - Simulates PBIX extraction locally so UI/features remain identical:
 *   • upload (pick file)
 *   • extract (simulated)
 *   • persist schema & preview to localStorage & context
 *   • preview tables, lazy "load more" (simulated pagination)
 *   • clear / next / back navigation
 *
 * Notes:
 * - Real .pbix parsing requires a backend; this file only simulates extraction so the UI remains functional.
 * - If you later want to hook a real backend, replace the simulateExtraction / loadMoreSimulation functions
 *   with real fetch calls and keep the UI structure and localStorage sync logic.
 */

/* ---------- Styles (kept from your original design, slightly cleaned) ---------- */
const Page = styled.div`
  width:100%;
  min-height:100vh;
  background: linear-gradient(180deg,#f7fbff,#fff);
  padding:28px; box-sizing:border-box;
`;
const Card = styled.div`
  max-width:1220px; margin:0 auto; background:#fff; border-radius:12px; padding:20px; box-shadow:0 12px 30px rgba(8,27,65,0.06);
`;
const Header = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;`;
const Title = styled.h2`margin:0;color:#0f1724;`;
const Sub = styled.div`color:#6b7280; font-size:13px;`;
const Grid = styled.div`display:flex; gap:16px; align-items:flex-start;`;
const Left = styled.div`flex:1; min-width:420px;`;
const Right = styled.div`width:420px;`;
const UploadBox = styled.label`
  display:flex; flex-direction:column; gap:8px;
  border:2px dashed #e6eef8; padding:18px; border-radius:10px; cursor:pointer;
  background: linear-gradient(180deg, rgba(15,99,254,0.03), transparent);
  align-items:center; justify-content:center;
  &:hover { border-color: rgba(15,99,254,0.18); transform:translateY(-2px); }
`;
const FileMeta = styled.div`background:#fbfdff;padding:12px;border-radius:8px;border:1px solid #eef6ff;`;
const Button = styled.button`
  padding:10px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:700;
  background:${p => p.primary ? '#0f62fe' : p.warn ? '#ef4444' : '#fff'}; color:${p => p.primary ? '#fff' : p.warn ? '#fff' : '#0f62fe'};
`;
const TableList = styled.div`margin-top:12px; border-radius:8px; overflow:auto; max-height:320px; border:1px solid #eef2ff; background:white;`;
const TableItem = styled.div`padding:10px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;`;
const Small = styled.div`font-size:13px;color:#6b7280;`;
const StatRow = styled.div`display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;`;
const Stat = styled.div`background:#fff;padding:8px 10px;border-radius:8px;border:1px solid #eef2ff;font-weight:700;`;
const PreviewBox = styled.div`margin-top:14px; border-radius:8px; border:1px solid #eef2ff; background:white; padding:8px;`;
const PreviewTable = styled.table`width:100%; border-collapse:collapse; font-size:13px;`;
const PreviewRow = styled.tr``;
const PreviewCell = styled.td`padding:8px;border-bottom:1px solid #f1f5f9; font-size:13px;`;

/* ---------- Utilities: fake extraction / row generation ---------- */
/** deterministic pseudo-random number generator (simple) */
function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** create a mock schema (tables + columns + rowCount) from filename */
function simulateExtractionFromFileName(fileName) {
    // use filename chars to seed PRNG for consistent results per file
    const seed = fileName.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) || Date.now();
    const rnd = mulberry32(seed);
    const nTables = Math.max(1, Math.floor(rnd() * 6) + 1); // 1-6 tables
    const tables = [];
    for (let i = 0; i < nTables; i++) {
        const tname = `Table_${i + 1}_${fileName.replace(/\.[^/.]+$/, '')}`;
        const nCols = Math.max(3, Math.floor(rnd() * 10) + 3); // 3-12 cols
        const cols = [];
        for (let c = 0; c < nCols; c++) {
            // choose simple types
            const types = ['string', 'number', 'date', 'boolean'];
            const t = types[Math.floor(rnd() * types.length)];
            cols.push({ name: `col_${c + 1}`, type: t });
        }
        const baseRows = Math.floor(rnd() * 2000) + 20; // 20 - ~2000
        tables.push({ name: tname, columns: cols.map(c => c.name), rowCount: baseRows });
    }
    // preview: only include first 10 rows per table
    const preview = {};
    tables.forEach(t => {
        preview[t.name] = {
            columns: t.columns,
            totalRows: t.rowCount,
            rows: generateRows(t.columns, Math.min(10, t.rowCount), seed + t.name.length)
        };
    });
    return { fileName, tables, preview };
}

/** generate fake rows for given columns */
function generateRows(columns = [], count = 10, seed = 1) {
    const rnd = mulberry32(seed);
    const rows = [];
    for (let r = 0; r < count; r++) {
        const row = {};
        columns.forEach((col, ci) => {
            // simple type-like generation based on column name (if contains 'date' -> date, 'id' -> number etc.)
            if (/date/i.test(col)) row[col] = new Date(Date.now() - Math.floor(rnd() * 1000 * 60 * 60 * 24 * 365)).toISOString().split('T')[0];
            else if (/id|count|num|qty|age|amount|total/i.test(col)) row[col] = Math.floor(rnd() * 10000);
            else if (/is_|has_|flag|active/i.test(col)) row[col] = rnd() > 0.5;
            else {
                // generate a short text
                row[col] = `val_${Math.floor(rnd() * 10000)}`;
            }
        });
        rows.push(row);
    }
    return rows;
}

/* ---------- Component ---------- */
export default function DBConnection() {
    const navigate = useNavigate();
    const { pbixSchema: ctxSchema, setPbixSchema, pbixPreview: ctxPreview, setPbixPreview } = useData();

    // local state
    const [fileName, setFileName] = useState(ctxSchema?.fileName || '');
    const [uploading, setUploading] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [schema, setSchema] = useState(ctxSchema || null);
    const [preview, setPreview] = useState(ctxPreview || {}); // { tableName: { rows: [...], totalRows, columns: [...] } }
    const [selectedTable, setSelectedTable] = useState((ctxSchema && ctxSchema.tables && ctxSchema.tables[0]) ? ctxSchema.tables[0].name : '');
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    // hydrate from localStorage on mount (only if context empty)
    useEffect(() => {
        if (!schema) {
            try {
                const raw = localStorage.getItem('pbix_extracted_schema');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    setSchema(parsed);
                    setFileName(parsed.fileName || '');
                    if (parsed.tables && parsed.tables[0]) setSelectedTable(parsed.tables[0].name);
                }
                const rawPreview = localStorage.getItem('pbix_extracted_preview');
                if (rawPreview) setPreview(JSON.parse(rawPreview));
            } catch (e) {
                // ignore parse errors
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // once

    // sync to context + localStorage whenever schema/preview change
    useEffect(() => {
        if (schema) {
            setPbixSchema(schema);
            try { localStorage.setItem('pbix_extracted_schema', JSON.stringify(schema)); } catch (e) { }
        } else {
            setPbixSchema(null);
        }
        if (preview) {
            setPbixPreview(preview);
            try { localStorage.setItem('pbix_extracted_preview', JSON.stringify(preview)); } catch (e) { }
        } else {
            setPbixPreview({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, preview]);

    // UI action: open file picker
    function chooseFile() {
        if (inputRef.current) inputRef.current.click();
    }

    // handle file selection locally (no backend)
    async function handleFile(e) {
        setError(null);
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        setFileName(f.name);
        setUploading(true);
        setProgressMsg('Simulating extraction — please wait...');
        try {
            // simulate a small delay
            await new Promise(res => setTimeout(res, 700));
            // we cannot parse pbix in-browser; so we simulate extraction deterministically based on filename
            const simulated = simulateExtractionFromFileName(f.name);
            setSchema({ fileName: simulated.fileName, tables: simulated.tables });
            setPreview(simulated.preview || {});
            setSelectedTable((simulated.tables && simulated.tables[0]) ? simulated.tables[0].name : '');
            setProgressMsg('Extraction (simulated) complete');
            setTimeout(() => setProgressMsg(''), 900);
        } catch (err) {
            console.error(err);
            setError('Failed to read file (simulation).');
        } finally {
            setUploading(false);
            // reset input value so the same file can be reselected later
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    // simulate server-side pagination: generate more rows for tableName
    async function loadMore(tableName) {
        setError(null);
        setProgressMsg('Loading more rows (simulated)...');
        try {
            const existing = preview[tableName] || { rows: [], totalRows: 0, columns: [] };
            const offset = existing.rows.length || 0;
            // simulate async
            await new Promise(res => setTimeout(res, 500));
            // find table definition to know totalRows
            const tableDef = (schema && schema.tables && schema.tables.find(t => t.name === tableName)) || null;
            const totalRows = tableDef ? (tableDef.rowCount || 0) : (existing.totalRows || 0);
            if (offset >= totalRows) {
                setProgressMsg('');
                return;
            }
            // compute how many to fetch: page size 200 (same as original code)
            const limit = Math.min(200, totalRows - offset);
            // generate rows based on columns and offset as seed to keep deterministic
            const newRows = generateRows(existing.columns || (tableDef ? tableDef.columns : []), limit, (offset + tableName.length + totalRows));
            const merged = {
                columns: existing.columns.length ? existing.columns : (tableDef ? tableDef.columns : []),
                totalRows,
                rows: (existing.rows || []).concat(newRows || [])
            };
            const nextPreview = { ...preview, [tableName]: merged };
            setPreview(nextPreview);
        } catch (err) {
            console.error(err);
            setError('Failed to load more (simulation).');
        } finally {
            setProgressMsg('');
        }
    }

    // handle Next navigation (same as before)
    function handleNext() {
        if (!schema || !schema.tables || schema.tables.length === 0) {
            setError('Please upload a .pbix (or simulate) and extract first.');
            return;
        }
        navigate('/pbix-structure-confirm', { state: { schema, preview } });
    }

    // helpers
    const tables = schema && schema.tables ? schema.tables : [];
    const currentPreview = selectedTable ? (preview[selectedTable] || { rows: [], totalRows: 0, columns: (schema?.tables?.find(t => t.name === selectedTable)?.columns || []) }) : { rows: [], totalRows: 0, columns: [] };
    const visibleRows = currentPreview.rows || [];

    return (
        <Page>
            <Card>
                <Header>
                    <div>
                        <Title>Upload Power BI (.pbix)</Title>
                        <Sub>We will extract the model (tables, columns, datatypes & sample rows) from your PBIX file. (Frontend-only simulation)</Sub>
                    </div>
                    <div>
                        <Small>File: <strong>{fileName || 'not uploaded'}</strong></Small>
                    </div>
                </Header>

                <Grid>
                    <Left>
                        <UploadBox onClick={chooseFile} role="button" aria-label="Upload PBIX">
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Click to upload .pbix</div>
                            <div style={{ fontSize: 13, color: '#374151' }}>This frontend simulates extraction locally so you can preview tables & rows without a backend.</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{uploading ? progressMsg : 'Supported: .pbix (simulation) — file not sent to server'}</div>
                            <input ref={inputRef} type="file" accept=".pbix,.pbix.zip,.json" onChange={handleFile} style={{ display: 'none' }} />
                        </UploadBox>

                        {error && <div style={{ marginTop: 12, color: '#7f1d1d', fontWeight: 700 }}>{error}</div>}

                        <FileMeta style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{schema ? schema.fileName : 'No pbix loaded'}</div>
                                    <Small>{schema && schema.tables ? `${schema.tables.length} table(s) detected` : 'Upload a pbix to analyze (simulated)'}</Small>
                                </div>
                                <div>
                                    <Button onClick={() => {
                                        // clear stored extraction
                                        setSchema(null);
                                        setPreview({});
                                        setFileName('');
                                        setPbixSchema(null);
                                        setPbixPreview(null);
                                        localStorage.removeItem('pbix_extracted_schema');
                                        localStorage.removeItem('pbix_extracted_preview');
                                    }}>Clear</Button>
                                </div>
                            </div>

                            <StatRow>
                                <Stat>{tables.length} tables</Stat>
                                <Stat>{selectedTable ? (preview[selectedTable]?.totalRows ?? '-') + ' rows' : '-'}</Stat>
                                <Stat>{selectedTable ? (preview[selectedTable]?.columns?.length ?? '-') + ' cols' : '-'}</Stat>
                            </StatRow>

                            <TableList style={{ marginTop: 12 }}>
                                {tables.length === 0 && <div style={{ padding: 12 }}><Small>No tables extracted yet.</Small></div>}
                                {tables.map(t => (
                                    <TableItem key={t.name}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{t.name}</div>
                                            <Small>{t.columns.length} cols • {t.rowCount ?? 'rows unknown'}</Small>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button onClick={() => {
                                                setSelectedTable(t.name);
                                                // if preview doesn't have initial rows, set a minimal preview from schema
                                                if (!preview[t.name]) {
                                                    const initial = {
                                                        columns: t.columns,
                                                        totalRows: t.rowCount || 0,
                                                        rows: generateRows(t.columns, Math.min(10, t.rowCount || 0), t.name.length)
                                                    };
                                                    setPreview(prev => ({ ...prev, [t.name]: initial }));
                                                }
                                            }}>Preview</Button>
                                        </div>
                                    </TableItem>
                                ))}
                            </TableList>
                        </FileMeta>
                    </Left>

                    <Right>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700 }}>{selectedTable || 'Select table to preview'}</div>
                            <Small>Preview (lazy load)</Small>
                        </div>

                        <PreviewBox>
                            <div style={{ marginBottom: 8 }}>
                                <Small>Columns:</Small>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                    {(currentPreview.columns || []).map(c => <div key={c} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #eef2ff', fontSize: 13 }}>{c}</div>)}
                                </div>
                            </div>

                            <div style={{ marginTop: 10 }}>
                                <Small>Rows preview ({visibleRows.length} / {currentPreview.totalRows ?? '—'})</Small>
                                <div style={{ overflow: 'auto', maxHeight: 320, marginTop: 8 }}>
                                    <PreviewTable>
                                        <thead>
                                            <PreviewRow>
                                                {(currentPreview.columns || []).slice(0, 12).map((col, i) => <th key={col + i} style={{ textAlign: 'left', padding: '8px', fontSize: 13, color: '#111827' }}>{col}</th>)}
                                            </PreviewRow>
                                        </thead>
                                        <tbody>
                                            {visibleRows.map((r, ri) => (
                                                <PreviewRow key={ri}>
                                                    {(currentPreview.columns || []).slice(0, 12).map((col, ci) => <PreviewCell key={col + ci}>{String(r[col] ?? '')}</PreviewCell>)}
                                                </PreviewRow>
                                            ))}
                                        </tbody>
                                    </PreviewTable>
                                </div>

                                {currentPreview.totalRows > visibleRows.length && (
                                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                                        <Button onClick={() => loadMore(selectedTable)}>Load more ({Math.min(200, (currentPreview.totalRows || 0) - visibleRows.length)})</Button>
                                    </div>
                                )}
                            </div>

                        </PreviewBox>

                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={() => navigate('/load-data')}>Back</Button>
                            <Button primary onClick={handleNext}>Next</Button>
                        </div>
                        {/* feedback message / progress */}
                        <div style={{ marginTop: 8 }}>
                            {progressMsg && <Small>{progressMsg}</Small>}
                        </div>
                    </Right>
                </Grid>
            </Card>
        </Page>
    );
}
