// src/pages/Connections.jsx
import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Page = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg,#f7fbff,#fff);
  padding: 28px;
  box-sizing: border-box;
`;
const Card = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(8,27,65,0.06);
`;
const Header = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;`;
const Title = styled.h2`margin:0; font-size:20px; color:#0f1724;`;
const Sub = styled.div`color:#6b7280; font-size:13px;`;
const Section = styled.div`margin-top:14px; display:flex; gap:14px; flex-wrap:wrap;`;
const Left = styled.div`flex:1; min-width:320px;`;
const Right = styled.div`width:380px; min-width:300px;`;
const Box = styled.div`
  background:#fbfdff; border-radius:10px; padding:14px; border:1px solid rgba(15,98,254,0.04);
`;
const Label = styled.div`font-size:13px;color:#6b7280;margin-bottom:8px;`;
const Select = styled.select`
  width:100%; padding:10px 12px; border-radius:8px; border:1px solid #e6eef8; font-size:14px;
`;
const ButtonRow = styled.div`display:flex; gap:10px; margin-top:12px; justify-content:flex-end;`;
const Button = styled.button`
  padding:10px 14px; border-radius:8px; border:none; cursor:pointer;
  background:${p => p.primary ? '#0f62fe' : p.warn ? '#ef4444' : '#fff'};
  color:${p => p.primary ? '#fff' : p.warn ? '#fff' : '#0f62fe'};
  font-weight:700;
`;
const StatRow = styled.div`display:flex; gap:12px; flex-wrap:wrap; margin-top:10px;`;
const Stat = styled.div`background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #eef2ff; font-weight:700;`;
const List = styled.div`max-height:260px; overflow:auto; margin-top:12px; border-radius:8px; border:1px solid #eef2ff; background:white; padding:10px;`;
const Item = styled.div`padding:6px 8px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;`;
const Tag = styled.span`
  padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700;
  background:${p => p.type === 'ok' ? '#ecfdf5' : p.type === 'warn' ? '#fff7ed' : '#fff1f2'};
  color:${p => p.type === 'ok' ? '#065f46' : p.type === 'warn' ? '#92400e' : '#7f1d1d'};
  border:1px solid ${p => p.type === 'ok' ? '#bbf7d0' : p.type === 'warn' ? '#fed7aa' : '#fecaca'};
`;
const Small = styled.div`font-size:13px; color:#6b7280;`;

function normalize(s){ return (String(s||'').trim().toLowerCase()); }

// compare helper
function compareColumns(requiredCols = [], uploadedCols = []) {
  const uploadedNormMap = new Map();
  for (const u of uploadedCols) uploadedNormMap.set(normalize(u), u);

  const missing = [];
  const matches = {}; // required -> uploaded or null
  for (const rc of requiredCols) {
    const n = normalize(rc);
    if (uploadedNormMap.has(n)) { matches[rc] = uploadedNormMap.get(n); }
    else {
      const alt = n.replace(/[\s_\-]/g,'');
      const found = uploadedCols.find(u => normalize(u).replace(/[\s_\-]/g,'') === alt);
      if (found) matches[rc] = found;
      else { matches[rc] = null; missing.push(rc); }
    }
  }
  const requiredNormSet = new Set(requiredCols.map(r => normalize(r)));
  const extra = uploadedCols.filter(u => !requiredNormSet.has(normalize(u)));
  return { missing, extra, matches };
}

export default function Connections(){
  const navigate = useNavigate();
  const { loadedData, loadedColumns, fileName } = useData();

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selected, setSelected] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [error, setError] = useState(null);

  // load reports on mount
  useEffect(() => {
    let mounted = true;
    async function fetchReports(){
      setLoadingReports(true);
      setError(null);
      try {
        const resp = await fetch('/api/powerbi/reports');
        if (!resp.ok) throw new Error('Failed to fetch reports');
        const data = await resp.json();
        // data may be { value: [...] } or array — handle both
        const list = Array.isArray(data) ? data : (data.value || data.reports || []);
        if (mounted) {
          setReports(list);
          if (list.length) {
            setSelected(list[0]);
          }
        }
      } catch (err) {
        setError(err.message || String(err));
        setReports([]);
      } finally { if (mounted) setLoadingReports(false); }
    }
    fetchReports();
    return () => { mounted = false; };
  }, []);

  // fetch schema for selected report
  async function fetchSchemaForSelected(rep){
    if (!rep) return;
    setSchema(null);
    setLoadingSchema(true);
    setError(null);
    try {
      const groupId = rep.groupId || rep.workspaceId || '';
      // datasetId might be directly on report object (some API shapes)
      const datasetId = rep.datasetId || rep.datasetIdValue || rep.dataset;
      if (!datasetId) throw new Error('Selected report does not expose datasetId');
      const query = new URLSearchParams();
      if (groupId) query.set('groupId', groupId);
      query.set('datasetId', datasetId);
      const resp = await fetch('/api/powerbi/schema?' + query.toString());
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Failed to fetch schema');
      }
      const data = await resp.json();
      // data likely has { value: [ {name, columns: [{name, dataType}]} ] }
      const tables = data.value || data.tables || data;
      setSchema(tables);
    } catch (err) {
      setError(err.response?.data?.message || err.message || String(err));
      setSchema(null);
    } finally {
      setLoadingSchema(false);
    }
  }

  // derived: uploaded columns (from context)
  const uploadedCols = useMemo(() => {
    if (Array.isArray(loadedColumns) && loadedColumns.length) return loadedColumns;
    if (Array.isArray(loadedData) && loadedData.length) return Object.keys(loadedData[0] || {});
    return [];
  }, [loadedColumns, loadedData]);

  // derived compare result: pick first table in schema if present
  const tableCols = useMemo(() => {
    if (!schema || !Array.isArray(schema)) return [];
    // choose first table by default
    const t = schema[0];
    if (!t) return [];
    const colNames = Array.isArray(t.columns) ? t.columns.map(c => c.name) : [];
    return colNames;
  }, [schema]);

  const compare = useMemo(() => compareColumns(tableCols, uploadedCols), [tableCols, uploadedCols]);

  return (
    <Page>
      <Card>
        <Header>
          <div>
            <Title>Connect report</Title>
            <Sub>Choose the Power BI report you want to sync with your uploaded dataset</Sub>
          </div>
          <div>
            <Small>Loaded file: <strong>{fileName || '—'}</strong></Small>
          </div>
        </Header>

        <Section>
          <Left>
            <Box>
              <Label>Available reports</Label>
              {loadingReports ? <Small>Loading reports…</Small> : (
                <>
                  {reports.length === 0 ? (
                    <Small>No reports available (make sure the service principal has access).</Small>
                  ) : (
                    <>
                      <Select value={selected ? (selected.id || selected.reportId || JSON.stringify(selected)) : ''} onChange={(e) => {
                        const val = e.target.value;
                        // find by id or fallback by index
                        const found = reports.find(r => (r.id === val || r.reportId === val));
                        if (found) setSelected(found);
                        else {
                          // try by parsing JSON (in case)
                          try {
                            const parsed = JSON.parse(val);
                            setSelected(parsed);
                          } catch { setSelected(reports[0]); }
                        }
                      }}>
                        {reports.map((r, idx) => {
                          const id = r.id || r.reportId || r.reportIdValue || `${idx}`;
                          const name = r.name || r.displayName || `Report ${idx+1}`;
                          return <option key={id} value={id}>{name} {r.datasetId ? `· dataset:${r.datasetId}` : ''}</option>;
                        })}
                      </Select>

                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button onClick={() => fetchSchemaForSelected(selected)}>Fetch schema</Button>
                        <Button onClick={() => {
                          // quick refresh reports list
                          setReports([]); setSelected(null);
                          (async () => {
                            try {
                              const resp = await fetch('/api/powerbi/reports');
                              const data = await resp.json();
                              const list = Array.isArray(data) ? data : (data.value || data.reports || []);
                              setReports(list);
                              setSelected(list[0] || null);
                            } catch (err) {
                              setError('Failed to refresh');
                            }
                          })();
                        }}>Refresh list</Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </Box>

            <Box style={{ marginTop: 12 }}>
              <Label>Upload preview / local dataset</Label>
              <Small>{uploadedCols.length ? `${uploadedCols.length} columns detected` : 'No dataset loaded or file missing'}</Small>
              <List>
                {uploadedCols.length === 0 && <Small>No columns to show.</Small>}
                {uploadedCols.map((c, i) => <Item key={c + i}><div>{c}</div><Tag type="ok">uploaded</Tag></Item>)}
              </List>
            </Box>
          </Left>

          <Right>
            <Box>
              <Label>Schema (report)</Label>
              {loadingSchema ? <Small>Loading schema…</Small> : schema ? (
                <>
                  <Small>Found tables: {Array.isArray(schema) ? schema.length : 0}</Small>
                  <StatRow>
                    <Stat>{tableCols.length} cols</Stat>
                    <Stat>{compare.missing.length} missing</Stat>
                    <Stat>{compare.extra.length} extra</Stat>
                  </StatRow>

                  <List style={{ marginTop: 12 }}>
                    {tableCols.length === 0 && <Small>No columns found in first table.</Small>}
                    {tableCols.map((tc, i) => {
                      const mapped = compare.matches[tc];
                      const tagType = mapped ? 'ok' : 'warn';
                      return <Item key={tc + i}><div>{tc}</div><Tag type={tagType}>{mapped ? `mapped → ${mapped}` : 'missing'}</Tag></Item>;
                    })}
                  </List>

                  <div style={{ marginTop: 12 }}>
                    <Label>Extra (in uploaded but not required)</Label>
                    <List>
                      {compare.extra.length === 0 ? <Small>None</Small> : compare.extra.map((e,i) => <Item key={e+i}><div>{e}</div><Tag type="ok">extra</Tag></Item>)}
                    </List>
                  </div>

                  <ButtonRow>
                    <Button onClick={() => {
                      // re-open LoadData if user wants to modify file
                      navigate('/load-data');
                    }}>Back to dataset</Button>

                    <Button primary onClick={() => {
                      // proceed to mapping page, pass state
                      if (!selected) { setError('Select a report first'); return; }
                      navigate('/mapping', { state: { report: selected, schema, compare, uploadedCols } });
                    }}>
                      Proceed to mapping
                    </Button>
                  </ButtonRow>
                </>
              ) : (
                <Small>No schema loaded. Select a report and click “Fetch schema”.</Small>
              )}
            </Box>

            <Box style={{ marginTop: 12 }}>
              <Label>Quick checks</Label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <Small>File: <strong>{fileName || '—'}</strong></Small>
                <Small>Uploaded columns: {uploadedCols.length}</Small>
                <Small>Report selected: <strong>{selected ? (selected.name || selected.displayName || selected.id) : '—'}</strong></Small>
              </div>
            </Box>
          </Right>
        </Section>

        {error && <div style={{ marginTop: 14, color: '#7f1d1d', fontWeight:700 }}>{error}</div>}
      </Card>
    </Page>
  );
}
