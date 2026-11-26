// File storage providers (utils/fileStorage.js), no network or database needed:
//
//   node test/fileStorage.js
//
// 1. local: multer uploads land in LOCAL_UPLOAD_DIR, GET /uploads serves them
//    with the safety headers, deleteStoredFiles removes them, traversal and
//    foreign paths are refused.
// 2. cloudinary (fake credentials, uploader stubbed): stored paths keep the same
//    shape, GET /uploads redirects to the derived Cloudinary URL (image vs raw),
//    deletes call destroy with the same public id, unknown paths fall through.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const MODE = process.argv[2];
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

if (!MODE) {
  // Each provider is fixed at load time: run each in its own process
  let failed = false;
  for (const mode of ['local', 'cloudinary']) {
    try {
      execFileSync(process.execPath, [__filename, mode], { stdio: 'inherit' });
    } catch {
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kommently-files-'));
process.env.LOG_LEVEL = 'silent';
process.env.LOCAL_UPLOAD_DIR = tmpDir;
process.env.CLOUDINARY_FOLDER = 'testfolder';
for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  process.env[k] = MODE === 'cloudinary' ? `fake-${k.toLowerCase()}` : '';
}

const express = require('express');
const multer = require('multer');

// Stub the Cloudinary uploader before the storage module configures it
const calls = { upload: [], destroy: [] };
if (MODE === 'cloudinary') {
  const { v2 } = require('cloudinary');
  v2.uploader.upload = async (file, opts) => {
    calls.upload.push({ file, opts, existed: fs.existsSync(file) });
    return { public_id: opts.public_id };
  };
  v2.uploader.destroy = async (publicId, opts) => {
    calls.destroy.push({ publicId, opts });
    return { result: 'ok' };
  };
}

const fileStorage = require('../utils/fileStorage');
const upload = require('../middleware/upload');
const uploadDocument = require('../middleware/uploadDocument');
const { deleteStoredFiles, discardUploads } = require('../utils/storage');

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

async function main() {
  console.log(`\n--- provider: ${MODE} ---`);
  check(`provider is ${MODE}`, fileStorage.PROVIDER === MODE, fileStorage.PROVIDER);
  check('LOCAL_UPLOAD_DIR is used', fileStorage.LOCAL_DIR === path.resolve(tmpDir));
  check('local folders are created', fs.existsSync(path.join(tmpDir, 'documents')));

  const app = express();
  const seen = {};
  app.post('/img', upload.single('screenshot'), (req, res) => {
    seen.img = { ...req.file, readable: fs.existsSync(req.file.path) };
    res.json({ path: `uploads/${req.file.filename}`, size: req.file.size });
  });
  app.post('/doc', uploadDocument.array('documents', 2), (req, res) => {
    seen.docs = req.files.map((f) => ({ ...f, readable: fs.existsSync(f.path) }));
    res.json({ paths: req.files.map((f) => `uploads/documents/${f.filename}`) });
  });
  app.post('/refuse', uploadDocument.array('documents', 2), (req, res) => {
    seen.refused = req.files.map((f) => ({ ...f }));
    discardUploads(req);
    res.status(403).json({ message: 'no' });
  });
  app.use('/uploads', fileStorage.uploadsRouter());
  app.use((req, res) => res.status(418).json({ message: 'fell through' }));
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));

  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, field, files) => {
    const form = new FormData();
    for (const f of files) form.append(field, new Blob([f.data], { type: f.type }), f.name);
    return fetch(base + url, { method: 'POST', body: form }).then(async (r) => ({ status: r.status, body: await r.json() }));
  };
  const get = (p) => fetch(base + '/' + p, { redirect: 'manual' });

  try {
    // Image upload
    const img = await post('/img', 'screenshot', [{ data: PNG, type: 'image/png', name: 'evil.html' }]);
    check('image upload succeeds', img.status === 200, JSON.stringify(img.body));
    check('stored name is a uuid with a mimetype extension', /^uploads\/[0-9a-f-]{36}\.png$/.test(img.body.path), img.body.path);
    check('size is reported', img.body.size === PNG.length);
    check('file.path is readable during the request', seen.img.readable);

    // Documents
    const docs = await post('/doc', 'documents', [
      { data: Buffer.from('%PDF-1.4 test'), type: 'application/pdf', name: 'a.pdf' },
      { data: PNG, type: 'image/png', name: 'b.png' },
    ]);
    check('document upload succeeds', docs.status === 200 && docs.body.paths.length === 2, JSON.stringify(docs.body));
    const [pdfPath, docImgPath] = docs.body.paths || [];

    // Files the server makes itself (website thumbnails)
    const thumb = await fileStorage.saveBuffer(PNG, { subdir: 'thumbnails', ext: '.png', mimetype: 'image/png' });
    check('saveBuffer returns an uploads/thumbnails path', /^uploads\/thumbnails\/[0-9a-f-]{36}\.png$/.test(thumb), thumb);
    if (MODE === 'local') {
      check('saveBuffer writes to LOCAL_UPLOAD_DIR/thumbnails', fs.existsSync(path.join(tmpDir, thumb.replace('uploads/', ''))));
      const rt = await get(thumb);
      check('GET /uploads serves a saved thumbnail', rt.status === 200);
    } else {
      const tname = thumb.replace('uploads/thumbnails/', '').replace('.png', '');
      check('saveBuffer uploads to Cloudinary as an image', calls.upload.some((c) => c.opts.public_id === `testfolder/thumbnails/${tname}` && c.opts.resource_type === 'image' && /^data:image\/png;base64,/.test(c.file)));
      const rt = await get(thumb);
      check('GET /uploads redirects a saved thumbnail', rt.status === 302 && (rt.headers.get('location') || '').endsWith(`/image/upload/v1/testfolder/thumbnails/${tname}.png`));
    }

    if (MODE === 'local') {
      const onDisk = path.join(tmpDir, img.body.path.replace('uploads/', ''));
      check('image is written to LOCAL_UPLOAD_DIR', fs.existsSync(onDisk));
      check('document is written to LOCAL_UPLOAD_DIR/documents', fs.existsSync(path.join(tmpDir, pdfPath.replace('uploads/', ''))));

      const r = await get(img.body.path);
      check('GET /uploads serves the image', r.status === 200 && (await r.arrayBuffer()).byteLength === PNG.length, String(r.status));
      check('served with nosniff', r.headers.get('x-content-type-options') === 'nosniff');

      // A non-inline type is sandboxed and downloaded
      const txt = await post('/doc', 'documents', [{ data: Buffer.from('<script>x</script>'), type: 'text/plain', name: 'x.txt' }]);
      const rt = await get(txt.body.paths[0]);
      check('non-image files are sandboxed downloads', rt.headers.get('content-disposition') === 'attachment' && /sandbox/.test(rt.headers.get('content-security-policy') || ''));

      const missing = await get('uploads/documents/00000000-0000-0000-0000-000000000000.png');
      check('missing files fall through (proxy catch-all / 404)', missing.status === 418, String(missing.status));

      // Refused upload is removed
      const ref = await post('/refuse', 'documents', [{ data: PNG, type: 'image/png', name: 'c.png' }]);
      await new Promise((r2) => setTimeout(r2, 100));
      check('refused uploads are deleted from disk', ref.status === 403 && !fs.existsSync(seen.refused[0].path));

      // Delete
      deleteStoredFiles([img.body.path, pdfPath]);
      await new Promise((r2) => setTimeout(r2, 100));
      check('deleteStoredFiles removes local files', !fs.existsSync(onDisk) && !fs.existsSync(path.join(tmpDir, pdfPath.replace('uploads/', ''))));

      // Paths outside the uploads folder are ignored
      const outside = path.join(path.dirname(tmpDir), `keep-${path.basename(tmpDir)}.txt`);
      fs.writeFileSync(outside, 'keep');
      deleteStoredFiles([`uploads/../${path.basename(outside)}`, path.relative(process.cwd(), outside), outside, null, 42]);
      await new Promise((r2) => setTimeout(r2, 100));
      check('deleteStoredFiles never touches files outside the uploads folder', fs.existsSync(outside));
      fs.unlinkSync(outside);
    } else {
      check('nothing is written to LOCAL_UPLOAD_DIR', fs.readdirSync(tmpDir).filter((f) => !['documents', 'thumbnails'].includes(f)).length === 0
        && fs.readdirSync(path.join(tmpDir, 'documents')).length === 0);
      const name = img.body.path.replace('uploads/', '').replace('.png', '');
      const up = calls.upload.find((c) => c.opts.public_id === `testfolder/${name}`);
      check('image uploaded to Cloudinary as an image resource', !!up && up.opts.resource_type === 'image' && up.existed && up.opts.overwrite === false);
      const pdfName = pdfPath.replace('uploads/documents/', '');
      const upPdf = calls.upload.find((c) => c.opts.public_id === `testfolder/documents/${pdfName}`);
      check('PDF uploaded to Cloudinary as a raw resource (id keeps the extension)', !!upPdf && upPdf.opts.resource_type === 'raw');
      check('documents images are image resources', calls.upload.some((c) => c.opts.public_id === `testfolder/documents/${docImgPath.replace('uploads/documents/', '').replace('.png', '')}` && c.opts.resource_type === 'image'));
      check('file.path stays readable for the request (temp copy)', seen.img.readable && seen.docs.every((d) => d.readable));
      await new Promise((r2) => setTimeout(r2, 100));
      check('temp copies are deleted after the response', !fs.existsSync(seen.img.path) && seen.docs.every((d) => !fs.existsSync(d.path)));

      const r = await get(img.body.path);
      const loc = r.headers.get('location') || '';
      check('GET /uploads redirects images to Cloudinary', r.status === 302
        && loc === `https://res.cloudinary.com/fake-cloudinary_cloud_name/image/upload/v1/testfolder/${name}.png`, loc);
      const rp = await get(pdfPath);
      const locPdf = rp.headers.get('location') || '';
      check('GET /uploads redirects documents to the raw URL', rp.status === 302
        && locPdf === `https://res.cloudinary.com/fake-cloudinary_cloud_name/raw/upload/v1/testfolder/documents/${pdfName}`, locPdf);

      // A file stored locally before the switch is still served from disk
      fs.writeFileSync(path.join(tmpDir, 'documents', 'legacy-file.png'), PNG);
      const legacy = await get('uploads/documents/legacy-file.png');
      check('older local files are still served from disk', legacy.status === 200);

      for (const p of ['uploads/../server.js', 'uploads/%2e%2e/app.js', 'uploads/other/x.png', 'uploads/.env']) {
        const bad = await get(p);
        if (bad.status === 302) { check(`no redirect for ${p}`, false, bad.headers.get('location')); }
      }
      check('invalid paths never redirect', true);

      const ref = await post('/refuse', 'documents', [{ data: PNG, type: 'image/png', name: 'c.png' }]);
      await new Promise((r2) => setTimeout(r2, 100));
      const refName = seen.refused[0].filename.replace('.png', '');
      check('refused uploads are destroyed in Cloudinary', ref.status === 403
        && calls.destroy.some((d) => d.publicId === `testfolder/documents/${refName}` && d.opts.resource_type === 'image'));

      calls.destroy.length = 0;
      deleteStoredFiles([img.body.path, pdfPath, 'uploads/../x.png', 'notuploads/x.png']);
      await new Promise((r2) => setTimeout(r2, 100));
      check('deleteStoredFiles destroys the Cloudinary copies only', calls.destroy.length === 2
        && calls.destroy.some((d) => d.publicId === `testfolder/${name}` && d.opts.resource_type === 'image')
        && calls.destroy.some((d) => d.publicId === `testfolder/documents/${pdfName}` && d.opts.resource_type === 'raw'),
      JSON.stringify(calls.destroy));
    }
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
