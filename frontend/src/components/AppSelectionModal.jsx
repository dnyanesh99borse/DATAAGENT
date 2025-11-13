// src/components/AppSelectionModal.jsx
import React, { useState } from 'react';
import styled from 'styled-components';

/* Simple modal + checkbox list. Non-invasive and uses props handlers.
   Props:
     open: boolean
     onClose: () => void
     fileName: string
     fileBlobGetter: () => Promise<{ blob, mimeType, suggestedName }>  // function that returns file blob (parsed file)
     onUploadAndOpen: (target, blob, suggestedName) => Promise<void>  // optional: handler to upload and open for cloud options
*/

const Backdrop = styled.div`
  position:fixed; inset:0; background: rgba(2,6,23,0.45); display:flex; align-items:center; justify-content:center; z-index:2000;
`;
const Card = styled.div`
  width:520px; max-width:94%; background:white; border-radius:12px; padding:18px; box-shadow:0 18px 60px rgba(2,6,23,0.25);
`;
const Row = styled.div`display:flex; align-items:center; gap:12px; margin:8px 0;`;
const Title = styled.h3`margin:0 0 8px 0;`;
const Actions = styled.div`display:flex; gap:10px; justify-content:flex-end; margin-top:14px;`;
const Button = styled.button`
  padding:8px 12px; border-radius:8px; border:none; cursor:pointer;
  background:${p => p.primary ? '#0f62fe' : '#fff'}; color:${p => p.primary ? '#fff' : '#0f62fe'};
  font-weight:600;
`;

export default function AppSelectionModal({ open, onClose, fileName, fileBlobGetter, onUploadAndOpen }) {
    const [selections, setSelections] = useState({
        download: true,
        excel: false,
        sheets: false
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    if (!open) return null;

    function toggle(key) {
        setSelections(prev => ({ ...prev, [key]: !prev[key] }));
    }

    // Client-side download function: ask the fileBlobGetter for file blob and trigger download
    async function handleDownload(blobInfo) {
        const { blob, suggestedName, mimeType } = blobInfo;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName || fileName || 'dataset.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function handleNext() {
        setError(null);
        setBusy(true);
        try {
            const blobInfo = await fileBlobGetter(); // {blob, mimeType, suggestedName}
            if (selections.download) {
                await handleDownload(blobInfo);
            }

            // Excel / Sheets options require backend/cloud. Call provided handler if set.
            if (selections.excel && typeof onUploadAndOpen === 'function') {
                // 'excel' target - your implementation can map to OneDrive upload + Office URI
                await onUploadAndOpen('excel', blobInfo.blob, blobInfo.suggestedName);
            }
            if (selections.sheets && typeof onUploadAndOpen === 'function') {
                // 'sheets' target - your implementation can map to Google Drive + Sheets open
                await onUploadAndOpen('sheets', blobInfo.blob, blobInfo.suggestedName);
            }

            setBusy(false);
            onClose();
        } catch (err) {
            console.error(err);
            setError(err && err.message ? err.message : 'Failed to open in selected apps.');
            setBusy(false);
        }
    }

    return (
        <Backdrop onClick={onClose}>
            <Card onClick={e => e.stopPropagation()}>
                <Title>Open with...</Title>
                <div style={{ color: '#374151', marginBottom: 10 }}>Select the application(s) you want to open this dataset with.</div>

                <div style={{ borderTop: '1px solid #eef2f7', paddingTop: 10 }}>
                    <Row>
                        <input type="checkbox" id="download" checked={selections.download} onChange={() => toggle('download')} />
                        <label htmlFor="download">Download & open locally (manual)</label>
                    </Row>
                    <Row>
                        <input type="checkbox" id="excel" checked={selections.excel} onChange={() => toggle('excel')} />
                        <label htmlFor="excel">Microsoft Excel (Open from cloud / Desktop if available)</label>
                    </Row>
                    <Row>
                        <input type="checkbox" id="sheets" checked={selections.sheets} onChange={() => toggle('sheets')} />
                        <label htmlFor="sheets">Google Sheets (Open in browser)</label>
                    </Row>
                </div>

                {error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div>}

                <Actions>
                    <Button onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button primary onClick={handleNext} disabled={busy}>
                        {busy ? 'Opening...' : 'Next'}
                    </Button>
                </Actions>
            </Card>
        </Backdrop>
    );
}
