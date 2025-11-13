// src/components/PreviewTable.jsx
import React from 'react';
import styled from 'styled-components';

const TableWrap = styled.div`
  overflow:auto;
  border-radius:8px;
  border:1px solid #e6eef8;
  background:white;
`;

const Table = styled.table`
  width:100%;
  border-collapse:collapse;
  font-size:13px;
`;

const Th = styled.th`
  text-align:left;
  padding:10px;
  background:#eef6ff; /* header highlight */
  position: sticky;
  top:0;
  z-index:2;
  border-bottom:1px solid #e6eef8;
`;

const TypeRowTh = styled.th`
  text-align:left;
  padding:6px;
  background:#f0f9ff; /* type row highlight slightly lighter */
  font-size:12px;
  color:#0f1724;
  font-weight:600;
  border-bottom:1px solid #eef6ff;
`;

const Td = styled.td`
  padding:8px;
  border-bottom:1px solid #f3f6fb;
  max-width:220px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
`;

export default function PreviewTable({ columns = [], rows = [], types = {} }) {
    const safeCols = Array.isArray(columns) ? columns : [];
    const safeRows = Array.isArray(rows) ? rows : [];

    if (safeRows.length === 0 || safeCols.length === 0) {
        return <div style={{ padding: 12, color: '#6b7280' }}>No data to preview.</div>;
    }

    return (
        <TableWrap>
            <Table>
                <thead>
                    <tr>
                        {safeCols.map((c, idx) => <Th key={idx}>{c}</Th>)}
                    </tr>
                    <tr>
                        {safeCols.map((c, idx) => {
                            const t = types && types[c] ? types[c].type || types[c] : '';
                            const extra = types && types[c] ? ` • ${types[c].uniqueCount ?? '-'} uniq` : '';
                            return <TypeRowTh key={idx}>{t}{extra}</TypeRowTh>;
                        })}
                    </tr>
                </thead>
                <tbody>
                    {safeRows.map((r, i) => (
                        <tr key={i}>
                            {safeCols.map((c, j) => <Td key={j} title={String(r[c] ?? '')}>{String(r[c] ?? '')}</Td>)}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </TableWrap>
    );
}
