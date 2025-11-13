// src/pages/DataEditor.jsx
import React from 'react';
import styled from 'styled-components';
import EditableTableVirtual from '../components/EditableTableVirtual';
import { useData } from '../context/DataContext';

const Card = styled.div`background:white;padding:20px;border-radius:12px;box-shadow:0 8px 24px rgba(12,24,48,0.06);`;

export default function DataEditor() {
    const { loadedData, loadedColumns } = useData();

    const initial = loadedData && loadedData.length ? loadedData : [
        { country: '', category: '', count: '', as_of_date: '' }
    ];

    const cols = loadedColumns && loadedColumns.length ? loadedColumns : ['country', 'category', 'count', 'as_of_date'];

    function handleSave(rows) {
        // TODO: replace with API call: axios.post('/api/pending', rows)
        console.log('Saving to pending (mock):', rows.slice(0, 5), '... total', rows.length);
        alert(`Saved ${rows.length} rows to pending (mock).`);
    }

    return (
        <div>
            <h2 style={{ marginBottom: 12 }}>Data Editor</h2>
            <Card>
                <EditableTableVirtual initialRows={initial} columns={cols} onSave={handleSave} />
            </Card>
        </div>
    )
}
