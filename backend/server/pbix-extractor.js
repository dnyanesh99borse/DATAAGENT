// C:\Users\LENOVO\Desktop\pbix-server\pbix-extractor.js
const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { parse } = require('csv-parse/sync');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const rimraf = require('rimraf');

const app = express();
app.use(cors());
app.use(express.json());

// simple request logger (prints content-type header too)
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url, 'headers:', { 'content-type': req.headers['content-type'] });
  next();
});

const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
const EXTRACT_DIR = path.resolve(__dirname, 'extracted');
if (!fsSync.existsSync(UPLOAD_DIR)) fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fsSync.existsSync(EXTRACT_DIR)) fsSync.mkdirSync(EXTRACT_DIR, { recursive: true });

// multer setup (increase fileSize if your PBIX > 200MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB limit

// full path to pbi-tools executable on Windows (update if needed)
const EXE_PATH = 'C:\\Tools\\pbi-tools\\pbi-tools.core.exe';

/**
 * Run pbi-tools extract pbix -> outDir (with --export-data)
 * Tries spawn without shell first; if CLI reports "No action" it will retry with shell:true.
 */
async function runPbiToolsExtract(pbixPath, outDir) {
  // basic checks
  if (!fsSync.existsSync(EXE_PATH)) throw new Error(`pbi-tools executable not found at ${EXE_PATH}`);
  if (!fsSync.existsSync(pbixPath)) throw new Error(`PBIX not found at ${pbixPath}`);

  const args = ['extract', pbixPath, '-o', outDir, '--export-data'];

  // helper to spawn
  const spawnOnce = (useShell = false) => {
    return new Promise((resolve, reject) => {
      console.log(`[pbi-tools] spawn (shell=${useShell}): ${EXE_PATH} ${args.join(' ')}`);
      const child = spawn(EXE_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: useShell });

      let stdout = '', stderr = '';
      child.stdout.on('data', d => { const s = d.toString(); stdout += s; process.stdout.write(`[pbi-tools stdout] ${s}`); });
      child.stderr.on('data', d => { const s = d.toString(); stderr += s; process.stderr.write(`[pbi-tools stderr] ${s}`); });

      child.on('error', err => {
        console.error('[pbi-tools] spawn error:', err);
        return reject(err);
      });

      child.on('close', code => {
        console.log(`[pbi-tools] process closed code=${code}`);
        if (code === 0) return resolve({ stdout, stderr });
        const e = new Error(stderr || stdout || `pbi-tools exited with code ${code}`);
        e.code = code; e.stdout = stdout; e.stderr = stderr;
        return reject(e);
      });
    });
  };

  // try without shell
  try {
    return await spawnOnce(false);
  } catch (err) {
    const msg = ((err.stderr || err.stdout || err.message) + '').toLowerCase();
    if (msg.includes('no action') || msg.includes('no action was specified')) {
      console.warn('[pbi-tools] retrying with shell:true due to CLI "No action" parse error');
      return await spawnOnce(true);
    }
    throw err;
  }
}

/* -------------------- Upload endpoint --------------------
   POST /api/pbix/upload
   form field: "file" (File) -> PBIX file
   Response: { jobId, message, stdout, stderr }
   The endpoint runs extraction synchronously (request waits until extraction finishes).
   For large PBIX you may want background processing — I can add that later if you want.
----------------------------------------------------------------- */
app.post('/api/pbix/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded (form field must be "file")' });

    const pbixPath = req.file.path;
    const jobId = uuidv4();
    const outDir = path.join(EXTRACT_DIR, jobId);
    fsSync.mkdirSync(outDir, { recursive: true });

    console.log(`Received upload ${req.file.originalname} -> ${pbixPath}. extracting to ${outDir}`);

    // run extraction
    const result = await runPbiToolsExtract(pbixPath, outDir);

    console.log(`Extraction completed for jobId=${jobId}`);
    return res.json({
      jobId,
      message: 'Extraction completed',
      stdout: result.stdout ? result.stdout.slice(0, 2000) : '',
      stderr: result.stderr ? result.stderr.slice(0, 2000) : ''
    });
  } catch (err) {
    console.error('Upload/extract error:', err && (err.stack || err.message || err));
    return res.status(500).json({
      message: err.message || 'Upload/extract failed',
      details: (err.stdout || err.stderr || '').slice ? (err.stdout || err.stderr || '').slice(0,2000) : undefined
    });
  }
});

/* -------------------- Preview endpoint --------------------
   GET /api/pbix/preview?table=<name>&jobId=<jobId>&offset=&limit=
   If jobId omitted, uses most recent directory under extracted/
----------------------------------------------------------------- */
app.get('/api/pbix/preview', async (req, res) => {
  try {
    const table = req.query.table;
    const jobId = req.query.jobId;
    const offset = parseInt(req.query.offset || '0', 10);
    const limit = parseInt(req.query.limit || '200', 10);

    if (!table) return res.status(400).json({ message: 'Missing query param: table' });

    let outDir = null;
    if (jobId) {
      const candidate = path.join(EXTRACT_DIR, jobId);
      if (fsSync.existsSync(candidate)) outDir = candidate;
    } else {
      const dnames = await fs.readdir(EXTRACT_DIR, { withFileTypes: true });
      const dirs = dnames.filter(d => d.isDirectory()).map(d => d.name).sort().reverse();
      if (dirs.length > 0) outDir = path.join(EXTRACT_DIR, dirs[0]);
    }
    if (!outDir) return res.status(404).json({ message: 'Extraction not found' });

    const manifestPath = path.join(outDir, 'manifest.json');
    let manifest = null;
    try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch (e) { /* ignore */ }

    // find CSV by file name match (recursive)
    let foundCsv = null;
    async function findCsv(dir) {
      const ents = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of ents) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          const f = await findCsv(full);
          if (f) return f;
        } else {
          if (ent.name.toLowerCase() === `${table.toLowerCase()}.csv`) return full;
          if (ent.name.toLowerCase().includes(table.toLowerCase()) && ent.name.toLowerCase().endsWith('.csv')) return full;
        }
      }
      return null;
    }
    foundCsv = await findCsv(outDir);

    if (!foundCsv) {
      const tblMeta = manifest && manifest.tables ? (manifest.tables.find(t => t.name === table) || null) : null;
      return res.json({ columns: tblMeta ? tblMeta.columns : [], rows: [], totalRows: tblMeta ? tblMeta.rowCount : 0 });
    }

    const raw = await fs.readFile(foundCsv, 'utf8');
    const records = parse(raw, { columns: true, skip_empty_lines: true });
    const totalRows = records.length;
    const slice = records.slice(offset, offset + limit);
    const cols = slice.length ? Object.keys(slice[0]) : (records.length ? Object.keys(records[0]) : []);
    return res.json({ columns: cols, rows: slice, totalRows });
  } catch (err) {
    console.error('Preview error', err);
    return res.status(500).json({ message: err.message || 'Preview error' });
  }
});

/* -------------------- Cleanup endpoint --------------------
   POST /api/pbix/cleanup -> removes extracted dirs older than 24 hours
----------------------------------------------------------------- */
app.post('/api/pbix/cleanup', async (req, res) => {
  try {
    const entries = await fs.readdir(EXTRACT_DIR, { withFileTypes: true });
    const now = Date.now();
    let removed = 0;
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const full = path.join(EXTRACT_DIR, ent.name);
        const stat = await fs.stat(full);
        const age = now - stat.mtimeMs;
        if (age > 24 * 3600 * 1000) {
          rimraf.sync(full);
          removed++;
        }
      }
    }
    return res.json({ removed });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Cleanup failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`pbix-extractor running on ${PORT}`));
