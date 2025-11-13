import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { List } from 'react-window';

const Container = styled.div``;
const Toolbar = styled.div`display:flex;justify-content:space-between;margin-bottom:12px;`;
const Button = styled.button`
  padding:8px 12px;border-radius:8px;border:none;background:${props => props.primary ? '#0f62fe' : 'white'};
  color:${props => props.primary ? 'white' : '#0f62fe'};cursor:pointer;font-weight:600;
`;
const RowStyled = styled.div`
  display:flex;align-items:center;padding:6px 8px;border-bottom:1px solid #f3f6fb;
`;
const Cell = styled.div`
  flex:1 0 200px; padding:6px 8px; overflow:hidden;
`;
const Input = styled.input`
  width:100%; padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px;
`;

export default function EditableTableVirtual({ initialRows = [], columns = [], onSave }) {
    const safeInitial = Array.isArray(initialRows) ? initialRows : [];
    const safeCols = Array.isArray(columns) && columns.length ? columns : ['country', 'category', 'count', 'as_of_date'];

    const [rows, setRows] = useState(() => safeInitial.map(r => ({ ...r })));
    const listRef = useRef(null);

    const updateCell = useCallback((rowIndex, col, value) => {
        setRows(prev => {
            const next = [...prev];
            next[rowIndex] = { ...next[rowIndex], [col]: value };
            return next;
        });
    }, []);

    function addRow() {
        const empty = safeCols.reduce((acc, c) => ({ ...acc, [c]: '' }), {});
        setRows(prev => [...prev, empty]);
        setTimeout(() => { if (listRef.current) listRef.current.scrollToItem(rows.length, 'end'); }, 50);
    }

    function deleteRow(i) {
        setRows(prev => prev.filter((_, idx) => idx !== i));
    }

    function saveAll() {
        const invalid = rows.find(r => r.count !== undefined && r.count !== '' && Number.isNaN(Number(r.count)));
        if (invalid) {
            alert('Validation error: ensure counts are numeric.');
            return;
        }
        if (onSave) onSave(rows);
    }

    const Row = ({ index, style }) => {
        const r = rows[index] || {};
        return (
            <div style={style} key={index}>
                <RowStyled>
                    {safeCols.map((c, j) => (
                        <Cell key={j}>
                            <Input value={r[c] ?? ''} onChange={e => updateCell(index, c, e.target.value)} aria-label={`row-${index}-col-${c}`} />
                        </Cell>
                    ))}
                    <Cell style={{ flex: '0 0 120px' }}>
                        <Button onClick={() => deleteRow(index)} style={{ background: '#ef4444', color: 'white' }}>Delete</Button>
                    </Cell>
                </RowStyled>
            </div>
        );
    };

    const rowHeight = 48;
    const listHeight = Math.min(600, Math.max(200, rows.length * 48));

    return (
        <Container>
            <Toolbar>
                <div>
                    <Button onClick={addRow}>Add row</Button>
                </div>
                <div>
                    <Button onClick={saveAll} primary>Save to Pending</Button>
                </div>
            </Toolbar>

            <div style={{ height: listHeight, border: '1px solid #e6eef8', borderRadius: 8, overflow: 'hidden' }}>
                <List
                    ref={listRef}
                    height={listHeight}
                    itemCount={rows.length}
                    itemSize={rowHeight}
                    width={'100%'}
                >
                    {Row}
                </List>
            </div>
        </Container>
    );
}
