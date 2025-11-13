import React, { useState } from 'react';
import styled from 'styled-components';

const Table = styled.table`
  width:100%;
  border-collapse: collapse;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(12, 24, 48, 0.06);
`;

const Th = styled.th`
  text-align:left;
  padding: 12px;
  background: #f1f5f9;
  font-weight:600;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #e6eef8;
`;

const Td = styled.td`
  padding: 10px;
  font-size: 14px;
  border-bottom: 1px solid #f3f6fb;
`;

const Input = styled.input`
  width:100%;
  padding:6px 8px;
  border:1px solid #e5e7eb;
  border-radius:6px;
`;

export default function EditableTable({ initialRows = [], onSave }) {
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState({}); // {rowIdx: {col: value}}

  function handleCellChange(rowIdx, col, value){
    const newRows = [...rows];
    newRows[rowIdx] = {...newRows[rowIdx], [col]: value};
    setRows(newRows);
  }

  function addRow(){
    setRows(prev => [...prev, { country: '', category: '', count: 0, as_of_date: '' }]);
  }

  function deleteRow(i){
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
        <div>
          <button onClick={addRow} style={{padding:'8px 12px', borderRadius:8, border:'none', background:'#0f62fe', color:'white'}}>Add row</button>
        </div>
        <div>
          <button onClick={() => onSave(rows)} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #0f62fe', background:'white', color:'#0f62fe'}}>Save to Pending</button>
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Country</Th>
            <Th>Category</Th>
            <Th>Count</Th>
            <Th>As of</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <Td><Input value={r.country} onChange={e => handleCellChange(i,'country', e.target.value)} placeholder="Country" /></Td>
              <Td><Input value={r.category} onChange={e => handleCellChange(i,'category', e.target.value)} placeholder="Category" /></Td>
              <Td><Input value={r.count} onChange={e => handleCellChange(i,'count', e.target.value)} placeholder="Count" /></Td>
              <Td><Input value={r.as_of_date} onChange={e => handleCellChange(i,'as_of_date', e.target.value)} placeholder="YYYY-MM-DD" /></Td>
              <Td>
                <button onClick={() => deleteRow(i)} style={{padding:'6px 10px', borderRadius:6, background:'#ef4444', color:'white', border:'none'}}>Delete</button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
