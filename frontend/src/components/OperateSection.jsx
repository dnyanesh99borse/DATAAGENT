// src/components/OperateSection.jsx
import React from 'react';
import styled from 'styled-components';

/* Styled components (matches existing app look) */
const OperateWrap = styled.div`
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
const OperateCard = styled.div`
  background: #f8fafc;
  border-radius: 10px;
  padding: 14px;
  min-height: 9.6vh;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  box-shadow: 0 6px 16px rgba(12,24,48,0.04);
  border: 1px solid rgba(14,78,255,0.04);
`;
const FileTitle = styled.div`font-size:14px;color:#0f1724;font-weight:700;`;
const FileMeta = styled.div`font-size:12px;color:#6b7280;margin-top:6px;`;
const BadgesRow = styled.div`display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;`;
const Badge = styled.span`
  padding:6px 8px;border-radius:8px;font-size:12px;font-weight:700;
  background:${p => p.warn ? '#fff1f2' : '#ecfdf5'}; color:${p => p.warn ? '#7f1d1d' : '#065f46'};
  border: 1px solid ${p => p.warn ? '#fecaca' : '#bbf7d0'};
`;
const ButtonRow = styled.div`display:flex; gap:8px; margin-top:12px;`;
const CTAButton = styled.button`
  padding:10px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:700;
  background:${p => p.primary ? '#0f62fe' : p.warn ? '#ef4444' : '#b82b2bff'};
  color:${p => p.primary ? '#fff' : p.warn ? '#fff' : '#fff'};
  box-shadow:${p => p.primary ? '0 8px 20px rgba(15,98,254,0.12)' : 'none'};
  flex: ${p => p.full ? 1 : '0 0 auto'};
`;

/* Utility: convert rows array + cols into CSV string (safe escaping) */
function rowsToCSV(rows, cols) {
    // If cols not provided, infer from first row
    const columns = Array.isArray(cols) && cols.length ? cols : (rows[0] ? Object.keys(rows[0]) : []);
    const escapeCell = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        // if includes quote or comma or newline, wrap in quotes and escape quotes
        if (/[",\n\r]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const lines = [];
    // header
    lines.push(columns.map(c => escapeCell(c)).join(','));
    // rows
    for (const r of rows) {
        const line = columns.map(c => escapeCell(r[c] ?? '')).join(',');
        lines.push(line);
    }
    return lines.join('\n');
}

/* Trigger browser download of content as file */
function downloadBlob(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // release url
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function OperateSection({
    fileName = '',
    rows = [],
    cols = [],
    stats = { totalRows: 0, totalCols: 0, blankCellCount: 0, duplicateRowsCount: 0 },
    onOpenMissing = () => { },
    onSaved = () => { }
}) {

    function handleDownloadCSV() {
        if (!rows || !rows.length) {
            onSaved({ ok: false, message: 'No data to save' });
            return;
        }
        const safeName = (fileName && fileName.replace(/\.[^/.]+$/, '')) || 'dataset';
        const csv = rowsToCSV(rows, cols);
        const filename = `${safeName}_export.csv`;
        downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
        onSaved({ ok: true, message: 'CSV downloaded', filename });
    }

    /* Optional: XLSX download - uncomment and implement if you add SheetJS (xlsx) to project
    function handleDownloadXLSX() {
      // Example: import * as XLSX from 'xlsx'; then:
      // const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
      // const wb = XLSX.utils.book_new();
      // XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      // XLSX.writeFile(wb, `${safeName}_export.xlsx`);
    }
    */

    return (
        <OperateWrap>
            <OperateCard>
                <div>
                    <FileTitle>{fileName || 'No file selected'}</FileTitle>
                    <FileMeta>
                        {stats.totalRows ? `${Number(stats.totalRows).toLocaleString()} rows • ${Number(stats.totalCols || cols.length || 0).toLocaleString()} cols` : 'Preview will appear after parsing'}
                    </FileMeta>

                    <BadgesRow>
                        {stats.blankCellCount > 0 && <Badge warn>{Number(stats.blankCellCount).toLocaleString()} empty</Badge>}
                        {stats.duplicateRowsCount > 0 && <Badge warn>{Number(stats.duplicateRowsCount).toLocaleString()} duplicates</Badge>}
                        {stats.blankCellCount === 0 && stats.duplicateRowsCount === 0 && stats.totalRows > 0 && <Badge>Clean ✓</Badge>}
                    </BadgesRow>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ButtonRow>
                        <CTAButton onClick={onOpenMissing} style={{ flex: 1 }}>Resolve errors</CTAButton>
                        <CTAButton primary onClick={handleDownloadCSV} style={{ flex: 1 }}>Save dataset</CTAButton>
                    </ButtonRow>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{stats.totalRows ? `Last parsed: ${Number(stats.totalRows).toLocaleString()} rows` : 'No file loaded'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{(stats.blankCellCount === 0 && stats.duplicateRowsCount === 0 && stats.totalRows > 0) ? 'Ready' : 'Requires cleaning'}</div>
                    </div>
                </div>
            </OperateCard>
        </OperateWrap>
    );
}
