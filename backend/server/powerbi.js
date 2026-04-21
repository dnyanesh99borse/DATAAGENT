// server/powerbi.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '15mb' }));

const TENANT = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let cachedToken = null; // { token, expiresAt }

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) return cachedToken.token; // use cached (1 min margin)

  const url = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

  const resp = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const token = resp.data.access_token;
  const expiresIn = resp.data.expires_in || 3600;
  cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

// Helper: Power BI GET
async function pbGet(path, params = {}) {
  const token = await getAccessToken();
  const url = `https://api.powerbi.com/v1.0/myorg${path}`;
  return axios.get(url, { headers: { Authorization: `Bearer ${token}` }, params });
}

// Helper: Power BI POST
async function pbPost(path, body) {
  const token = await getAccessToken();
  const url = `https://api.powerbi.com/v1.0/myorg${path}`;
  return axios.post(url, body, { headers: { Authorization: `Bearer ${token}` } });
}

/**
 * GET /api/powerbi/reports?groupId=<workspaceId>
 * returns list of reports with datasetId and embedUrl
 */
app.get('/api/powerbi/reports', async (req, res) => {
  try {
    const groupId = req.query.groupId; // optional: if omitted lists all accessible reports
    const path = groupId ? `/groups/${groupId}/reports` : `/reports`;
    const r = await pbGet(path);
    res.json(r.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to list reports', detail: err.response?.data || err.message });
  }
});

/**
 * GET /api/powerbi/schema?groupId=&datasetId=
 * returns tables + columns for the dataset
 */
app.get('/api/powerbi/schema', async (req, res) => {
  try {
    const { groupId, datasetId } = req.query;
    if (!datasetId) return res.status(400).json({ message: 'datasetId required' });
    const path = groupId ? `/groups/${groupId}/datasets/${datasetId}/tables` : `/datasets/${datasetId}/tables`;
    const r = await pbGet(path);
    // r.data.value: array of tables { name, columns: [{name, dataType}] }
    res.json(r.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to fetch schema', detail: err.response?.data || err.message });
  }
});

/**
 * POST /api/powerbi/generate-embed
 * body: { groupId, reportId, accessLevel?: "View" }
 * returns embed token and embedUrl
 */
app.post('/api/powerbi/generate-embed', async (req, res) => {
  try {
    const { groupId, reportId, accessLevel = 'View' } = req.body;
    if (!groupId || !reportId) return res.status(400).json({ message: 'groupId and reportId required' });

    // generate token (Report GenerateToken)
    const path = `/groups/${groupId}/reports/${reportId}/GenerateToken`;
    const r = await pbPost(path, { accessLevel });
    res.json(r.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to generate embed token', detail: err.response?.data || err.message });
  }
});

/**
 * POST /api/powerbi/refresh
 * body: { groupId, datasetId }
 */
app.post('/api/powerbi/refresh', async (req, res) => {
  try {
    const { groupId, datasetId } = req.body;
    if (!datasetId) return res.status(400).json({ message: 'datasetId required' });
    const path = groupId ? `/groups/${groupId}/datasets/${datasetId}/refreshes` : `/datasets/${datasetId}/refreshes`;
    const r = await pbPost(path, { notifyOption: 'NoNotification' });
    res.json({ message: 'Refresh started', data: r.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to trigger refresh', detail: err.response?.data || err.message });
  }
});

/**
 * POST /api/upload-validated
 * Accepts mapped rows and does DB insert (you must implement actual DB logic).
 * Body: { datasetId, tableName, rows: [ {col:val,...} ] }
 */
app.post('/api/upload-validated', async (req, res) => {
  try {
    const { datasetId, tableName, rows } = req.body;
    if (!rows || !rows.length) return res.status(400).json({ message: 'No rows provided' });

    // === PLACEHOLDER: your DB write logic ===
    // Example for postgres using node-postgres:
    // - Create temporary table or truncate target
    // - Bulk insert (COPY FROM or batch INSERT)
    // - commit
    // For now we simulate:
    console.log(`Received ${rows.length} rows for table ${tableName} (dataset ${datasetId}).`);

    // After writing to DB, call Power BI refresh:
    // await pbPost(`/groups/${groupId}/datasets/${datasetId}/refreshes`, { notifyOption:'NoNotification' });

    res.json({ ok: true, message: 'Rows accepted (DB logic stub). Call pb refresh next.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to accept validated upload', detail: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`PowerBI helper running on ${port}`));
