// src/pages/LoadData.jsx
import React, { useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import PreviewTable from '../components/PreviewTable';
import AppSelectionModal from '../components/AppSelectionModal';
import MissingValuesModal from '../components/MissingValuesModal';
import OperateSection from '../components/OperateSection';

const Container = styled.div`
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  background: linear-gradient(180deg,#f7fbff,#fff);
`;
const Card = styled.div`
  width:98%;
  max-width:1220px;
  background:#fff;
  padding: 10px;
  border-radius:12px;
  box-shadow:0 10px 30px rgba(8, 27, 65, 0.09);
`;
const Header = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;`;
const Title = styled.h2`margin:0;font-size:20px;color:#0f1724;`;
const StepRow = styled.div`display:flex;gap:12px;margin:12px 0 20px 0;align-items:center;`;
const FileArea = styled.label`
  flex: 1;
  height: 17vh;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e6eef8;
  padding: 18px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  color: #0f1724;
  background: linear-gradient(180deg, rgba(15, 99, 254, 0.03), transparent);
  transition: background .12s ease, border-color .12s ease, transform .06s ease;
  gap: 12px;

  &:hover {
    background: linear-gradient(180deg, rgba(15, 99, 254, 0.06), rgba(15,99,254,0.01));
    border-color: rgba(15,99,254,0.25);
    transform: translateY(-2px);
  }

  .upload-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .upload-icon {
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(15,98,254,0.08);
    margin-bottom: 8px;
  }

  .upload-title { font-weight: 700; font-size: 15px; }
  .upload-sub { font-size: 13px; color: #374151; margin-top: 2px; }
`;

const InfoPanel = styled.div`
  display:flex; gap:16px; align-items:center; justify-content:space-between; margin-top:18px; padding:14px; border-radius:10px;
  border: 2px solid ${p => p.safe ? '#10b981' : '#ef4444'};
  background: ${p => p.safe ? 'linear-gradient(180deg, rgba(16,185,129,0.06), transparent)' : 'linear-gradient(180deg, rgba(239,68,68,0.04), transparent)'};
  transition: border-color .18s ease, background .18s ease;
`;
const InfoLeft = styled.div`display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;`;
const InfoBlock = styled.div`min-width:140px;`;
const InfoLabel = styled.div`font-size:12px;color:#6b7280;margin-bottom:6px;`;
const InfoStat = styled.div`font-size:16px;color:#0f1724;font-weight:700;`;
const SmallMeta = styled.div`font-size:13px;color:#6b7280;margin-top:6px;`;

const ControlsRight = styled.div`display:flex;flex-direction:column;align-items:flex-end;gap:8px;`;
const CTAButton = styled.button`
  width:8vw;padding:10px 10px;border-radius:8px;border:none;cursor:pointer;font-weight:700;
  background:${p => p.primary ? '#0f62fe' : p.warn ? '#b82b2bff' : '#fff'}; 
  color:${p => p.primary ? '#fff' : p.warn ? '#fff' : '#0f62fe'};
  box-shadow:${p => p.primary ? '0 8px 20px rgba(15,98,254,0.12)' : 'none'};
`;
const Muted = styled.div`font-size:13px;color:#6b7280;`;
const InfoErrorList = styled.ul`margin:8px 0 0 18px;color:#7f1d1d;font-size:13px;`;

export default function LoadData() {
    const navigate = useNavigate();
    const {
        loadedData, setLoadedData,
        loadedColumns, setLoadedColumns,
        fileName, setFileName
    } = useData(); // ✅ context for persistent data

    const [previewCount, setPreviewCount] = useState(200);
    const [errorMsg, setErrorMsg] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [missingModalOpen, setMissingModalOpen] = useState(false);
    const inputRef = useRef(null);

    /** -------- File Parsing -------- **/
    function parseCSVFile(file) {
        setErrorMsg(null);
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: function (results) {
                if (!results || !results.data) { setErrorMsg('Failed to parse CSV (no data).'); return; }
                const data = results.data;
                setLoadedData(data);
                setLoadedColumns(results.meta && results.meta.fields ? results.meta.fields : Object.keys(data[0] || {}));
                setPreviewCount(200);
                setFileName(file.name);
            },
            error: function (err) { setErrorMsg('Failed to parse CSV: ' + (err && err.message ? err.message : String(err))); }
        });
    }

    function parseXLSXFile(file) {
        setErrorMsg(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                setLoadedData(json);
                setLoadedColumns(Object.keys(json[0] || {}));
                setPreviewCount(200);
                setFileName(file.name);
            } catch (err) {
                setErrorMsg('Failed to parse XLSX: ' + (err && err.message ? err.message : String(err)));
            }
        };
        reader.onerror = () => setErrorMsg('Failed to read file');
        reader.readAsArrayBuffer(file);
    }

    function handleFile(e) {
        setErrorMsg(null);
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (ext === 'csv') parseCSVFile(f);
        else if (ext === 'xlsx' || ext === 'xls') parseXLSXFile(f);
        else setErrorMsg('Unsupported file type. Please upload CSV or XLSX');
    }

    function handleDrop(e) { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; handleFile({ target: { files: [f] } }); }
    function handleDragOver(e) { e.preventDefault(); }

    function loadMore() { setPreviewCount(p => Math.min(p + 200, loadedData.length)); }

    const stats = useMemo(() => {
        const safeRows = Array.isArray(loadedData) ? loadedData : [];
        const safeCols = Array.isArray(loadedColumns) && loadedColumns.length ? loadedColumns : (safeRows[0] ? Object.keys(safeRows[0]) : []);
        const totalRows = safeRows.length;
        const totalCols = safeCols.length;
        let blankCellCount = 0;
        const colBlanks = {};
        for (let c of safeCols) colBlanks[c] = 0;
        for (let r of safeRows) {
            for (let c of safeCols) {
                const v = r[c];
                if (v === null || v === undefined || String(v).trim() === '') { blankCellCount++; colBlanks[c]++; }
            }
        }
        const seen = new Map();
        for (let r of safeRows) {
            const key = safeCols.map(c => String(r[c] ?? '')).join('||');
            seen.set(key, (seen.get(key) || 0) + 1);
        }
        let duplicateRowsCount = 0;
        for (let v of seen.values()) if (v > 1) duplicateRowsCount += v;
        return { totalRows, totalCols, blankCellCount, duplicateRowsCount, colBlanks, safeCols };
    }, [loadedData, loadedColumns]);

    const isClean = useMemo(() => stats.blankCellCount === 0 && stats.duplicateRowsCount === 0, [stats]);

    async function handleApplyMissing(newRows, log, droppedCount) {
        setLoadedData(newRows);
        setLoadedColumns(Object.keys(newRows[0] || {}));
        setErrorMsg(null);
    }

    function handleNext() {
        setErrorMsg(null);
        if (!loadedData || loadedData.length === 0) { setErrorMsg('Load a dataset first.'); return; }
        const issues = [];
        if (stats.blankCellCount > 0) issues.push('Resolve null/blank cells');
        if (stats.duplicateRowsCount > 0) issues.push('Resolve duplicate rows');
        if (issues.length) {
            setErrorMsg('Dataset has issues: ' + issues.join(' • '));
            return;
        }
        setLoadedData(loadedData);
        setLoadedColumns(loadedColumns);
        navigate('/connections');
    }

    const previewSlice = Array.isArray(loadedData) ? loadedData.slice(0, previewCount) : [];

    return (
        <Container>
            <Card>
                <Header>
                    <Title>Load dataset</Title>
                    <div style={{ color: '#6b7280' }}>Step 1 — Upload & preview</div>
                </Header>

                <p style={{ color: '#374151', marginTop: 0 }}>
                    Upload CSV or Excel (.xlsx). Preview first 200 rows. Use the Missing Values tool to choose per-column handling.
                </p>

                <StepRow>
                    <FileArea onDrop={handleDrop} onDragOver={handleDragOver} htmlFor="fileInput">
                        <div className="upload-inner" aria-hidden>
                            <div className="upload-icon" aria-hidden>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                    <path d="M12 3v10" stroke="#0f1724" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 7l4-4 4 4" stroke="#0f1724" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#0f1724" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="upload-title">Upload CSV or Excel</div>
                            <div className="upload-sub">Drag & drop or click to browse</div>
                        </div>
                        <input
                            ref={inputRef}
                            id="fileInput"
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFile}
                            style={{ display: 'none' }}
                        />
                    </FileArea>

       {/*-----this section provides the options for data cleansing and save the changed dataset in our local----- */}
                    <OperateSection
                        fileName={fileName}
                        rows={loadedData}
                        cols={loadedColumns}
                        stats={{
                            totalRows: stats.totalRows,
                            totalCols: stats.totalCols,
                            blankCellCount: stats.blankCellCount,
                            duplicateRowsCount: stats.duplicateRowsCount
                        }}
                        //resolve error button.
                        onOpenMissing={() => setMissingModalOpen(true)}
                        onSaved={(result) => {
                            if (!result.ok) setErrorMsg(result.message || 'Save failed');
                            else setErrorMsg(null);
                        }}
                    />

                </StepRow>

                {loadedData && loadedData.length > 0 && (
                    <>
                        <InfoPanel safe={isClean}>
                            <InfoLeft>
                                <InfoBlock>
                                    <InfoLabel>Filename</InfoLabel>
                                    <InfoStat>{fileName || '-'}</InfoStat>
                                    <SmallMeta>{stats.totalRows} rows • {stats.totalCols} cols</SmallMeta>
                                </InfoBlock>

                                <InfoBlock>
                                    <InfoLabel>Blank / Null</InfoLabel>
                                    <InfoStat>{stats.blankCellCount}</InfoStat>
                                    <SmallMeta>Empty cells across dataset</SmallMeta>
                                </InfoBlock>

                                <InfoBlock>
                                    <InfoLabel>Duplicates</InfoLabel>
                                    <InfoStat>{stats.duplicateRowsCount}</InfoStat>
                                    <SmallMeta>Exact-row duplicates</SmallMeta>
                                </InfoBlock>
                            </InfoLeft>

                            <ControlsRight>
                                {!isClean ? (
                                    <>
                                        <div style={{ color: '#7f1d1d', fontWeight: 700 }}>Issues detected</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <CTAButton warn onClick={() => setMissingModalOpen(true)}>Clean & Reupload</CTAButton>
                                            <CTAButton primary onClick={handleNext}>Next</CTAButton>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ color: '#065f46', fontWeight: 700 }}>Looks clean</div>
                                        <CTAButton primary onClick={handleNext}>Next (Process)</CTAButton>
                                    </>
                                )}
                                <Muted style={{ marginTop: 6 }}>Tip: preview and apply per-column fixes in Missing values.</Muted>
                            </ControlsRight>
                        </InfoPanel>

                        {errorMsg && (
                            <div style={{ marginTop: 12 }}>
                                <div style={{ color: '#7f1d1d', fontWeight: 700, marginBottom: 6 }}>Issues</div>
                                <InfoErrorList>
                                    {errorMsg.split(' • ').map((it, i) => <li key={i}>{it}</li>)}
                                </InfoErrorList>
                            </div>
                        )}
                    </>
                )}

                <div style={{ marginTop: 18 }}>
                    <h4 style={{ marginBottom: 10 }}>Preview (first {previewCount} rows)</h4>
                    <PreviewTable columns={loadedColumns} rows={previewSlice} />
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
                    {loadedData && loadedData.length > previewCount && (
                        <CTAButton onClick={loadMore}>Load more ({Math.min(200, loadedData.length - previewCount)} more)</CTAButton>
                    )}
                </div>
            </Card>

            <AppSelectionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                fileName={fileName}
                fileBlobGetter={async () => {
                    const rows = loadedData || [];
                    const colsArr = loadedColumns && loadedColumns.length ? loadedColumns : (rows[0] ? Object.keys(rows[0]) : []);
                    const csvLines = [colsArr.join(',')];
                    for (const r of rows) {
                        const line = colsArr.map(c => {
                            const val = r[c] ?? '';
                            const text = String(val).replace(/"/g, '""');
                            return `"${text}"`;
                        }).join(',');
                        csvLines.push(line);
                    }
                    const csvStr = csvLines.join('\n');
                    const blob = new Blob([csvStr], { type: 'text/csv' });
                    return { blob, mimeType: 'text/csv', suggestedName: fileName || 'dataset.csv' };
                }}
                onUploadAndOpen={async (target, blob, suggestedName) => {
                    const form = new FormData();
                    form.append('file', blob, suggestedName || 'dataset.csv');
                    form.append('target', target);
                    const resp = await fetch('/api/upload-temp', { method: 'POST', body: form });
                    const data = await resp.json();
                    if (!resp.ok) throw new Error(data?.message || 'Upload failed');
                    if (target === 'excel' && data.publicUrl) {
                        const officeUri = `ms-excel:ofe|u|${encodeURIComponent(data.publicUrl)}`;
                        window.open(officeUri);
                        window.open(data.publicUrl, '_blank');
                    }
                    if (target === 'sheets' && data.driveUrl) {
                        window.open(data.driveUrl, '_blank');
                    }
                }}
            />

            <MissingValuesModal
                open={missingModalOpen}
                onClose={() => setMissingModalOpen(false)}
                columns={stats.safeCols || []}
                rows={loadedData}
                columnBlanks={stats.colBlanks || {}}
                onApply={async (newRows, log, droppedCount) => {
                    await handleApplyMissing(newRows, log, droppedCount);
                    setMissingModalOpen(false);
                }}
            />
        </Container>
    );
}
