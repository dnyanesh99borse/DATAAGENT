const express = require('express');
const multer = require('multer');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url, 'content-type:', req.headers['content-type']);
  next();
});

app.post('/upload-test', upload.single('file'), (req, res) => {
  console.log('req.file:', !!req.file, 'req.body keys:', Object.keys(req.body));
  res.json({ ok: !!req.file, filename: req.file && req.file.originalname });
});

app.get('/', (req, res) => res.send('ok'));

app.listen(5000, () => console.log('test server on 5000'));
