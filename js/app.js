// app.js — UI wiring and orchestration
(function () {
  const { humanSize, mdFileName, fileExt, downloadBlob, downloadZip } = window.ConvUtils;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const listPanel = document.getElementById('listPanel');
  const fileList = document.getElementById('fileList');
  const fileCount = document.getElementById('fileCount');
  const convertAllBtn = document.getElementById('convertAllBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const clearBtn = document.getElementById('clearBtn');
  const previewPanel = document.getElementById('previewPanel');
  const previewArea = document.getElementById('previewArea');
  const emptyState = document.getElementById('emptyState');
  const tabMd = document.getElementById('tabMd');
  const tabSrc = document.getElementById('tabSrc');

  const optGfm = document.getElementById('optGfm');
  const optFrontmatter = document.getElementById('optFrontmatter');
  const optStripNav = document.getElementById('optStripNav');
  const optPdfHeadings = document.getElementById('optPdfHeadings');
  const optPdfPageBreaks = document.getElementById('optPdfPageBreaks');

  let entries = []; // {id, name, type: 'html'|'pdf', raw, md, status, size}
  let activeId = null;
  let previewMode = 'md';
  let idSeq = 0;

  function detectType(name) {
    const ext = fileExt(name);
    if (ext === 'pdf') return 'pdf';
    if (ext === 'htm' || ext === 'html') return 'html';
    return null;
  }

  async function convertOne(entry) {
    try {
      if (entry.type === 'html') {
        entry.md = window.HtmlToMd.convert(entry.raw, {
          gfm: optGfm.checked,
          frontmatter: optFrontmatter.checked,
          stripNav: optStripNav.checked
        });
      } else if (entry.type === 'pdf') {
        entry.md = await window.PdfToMd.convert(entry.raw, {
          detectHeadings: optPdfHeadings.checked,
          pageBreaks: optPdfPageBreaks.checked
        });
      }
      entry.status = 'done';
    } catch (err) {
      entry.status = 'error';
      entry.md = '';
      console.error('Convert error for', entry.name, err);
    }
  }

  function render() {
    if (entries.length === 0) {
      listPanel.style.display = 'none';
      previewPanel.classList.remove('show');
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    listPanel.style.display = 'block';
    fileCount.textContent = entries.length + ' file';

    fileList.innerHTML = '';
    entries.forEach(entry => {
      const li = document.createElement('li');

      const type = document.createElement('div');
      type.className = 'type' + (entry.type === 'pdf' ? ' pdf' : '');
      type.textContent = entry.type.toUpperCase();

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = entry.name;
      name.title = entry.name;
      name.addEventListener('click', () => { activeId = entry.id; render(); });

      const size = document.createElement('div');
      size.className = 'size';
      size.textContent = humanSize(entry.size);

      const status = document.createElement('div');
      status.className = 'status ' + entry.status;
      status.textContent = entry.status === 'pending' ? 'Belum diconvert' : entry.status === 'done' ? 'Selesai' : 'Error';

      const dl = document.createElement('a');
      dl.className = 'dl';
      dl.textContent = 'Download';
      dl.style.display = entry.status === 'done' ? 'inline' : 'none';
      dl.addEventListener('click', () => downloadSingle(entry));

      const rm = document.createElement('div');
      rm.className = 'rm';
      rm.textContent = '✕';
      rm.addEventListener('click', () => {
        entries = entries.filter(e => e.id !== entry.id);
        if (activeId === entry.id) activeId = null;
        render();
      });

      li.appendChild(type);
      li.appendChild(name);
      li.appendChild(size);
      li.appendChild(status);
      li.appendChild(dl);
      li.appendChild(rm);
      fileList.appendChild(li);
    });

    const anyDone = entries.some(e => e.status === 'done');
    downloadZipBtn.disabled = !anyDone;

    showPreview();
  }

  function showPreview() {
    const entry = entries.find(e => e.id === activeId);
    if (!entry) { previewPanel.classList.remove('show'); return; }
    previewPanel.classList.add('show');
    if (previewMode === 'md') {
      previewArea.value = entry.md || '(belum diconvert)';
    } else {
      previewArea.value = entry.type === 'html' ? entry.raw : '(preview sumber asli tidak tersedia untuk PDF — lihat tab Markdown)';
    }
  }

  function downloadSingle(entry) {
    if (entry.status !== 'done') return;
    downloadBlob(mdFileName(entry.name), entry.md, 'text/markdown');
  }

  function addFiles(fileArr) {
    const valid = fileArr.filter(f => detectType(f.name));
    const readers = valid.map(f => new Promise((resolve) => {
      const type = detectType(f.name);
      const reader = new FileReader();
      reader.onload = () => {
        entries.push({
          id: 'f' + (++idSeq),
          name: f.name,
          type,
          raw: reader.result,
          md: '',
          status: 'pending',
          size: f.size
        });
        resolve();
      };
      reader.onerror = () => resolve();
      if (type === 'pdf') {
        reader.readAsArrayBuffer(f);
      } else {
        reader.readAsText(f);
      }
    }));
    Promise.all(readers).then(() => {
      if (!activeId && entries.length) activeId = entries[0].id;
      render();
    });
  }

  // --- Event wiring ---

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFiles(Array.from(e.target.files));
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add('drag');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove('drag');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) addFiles(Array.from(dt.files));
  });

  convertAllBtn.addEventListener('click', async () => {
    convertAllBtn.disabled = true;
    convertAllBtn.textContent = 'Mengonversi...';
    for (const entry of entries) {
      await convertOne(entry);
      render();
    }
    convertAllBtn.disabled = false;
    convertAllBtn.textContent = 'Convert Semua';
  });

  downloadZipBtn.addEventListener('click', () => {
    const done = entries.filter(e => e.status === 'done');
    if (done.length === 0) return;
    downloadZip(done.map(e => ({ name: mdFileName(e.name), content: e.md })));
  });

  clearBtn.addEventListener('click', () => {
    entries = [];
    activeId = null;
    render();
  });

  tabMd.addEventListener('click', () => {
    previewMode = 'md';
    tabMd.classList.add('active');
    tabSrc.classList.remove('active');
    showPreview();
  });
  tabSrc.addEventListener('click', () => {
    previewMode = 'src';
    tabSrc.classList.add('active');
    tabMd.classList.remove('active');
    showPreview();
  });

  render();
})();
