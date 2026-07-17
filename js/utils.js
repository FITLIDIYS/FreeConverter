// utils.js — small shared helpers, exposed on window.ConvUtils
(function () {
  function humanSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function mdFileName(name) {
    return name.replace(/\.[^.]+$/, '') + '.md';
  }

  function fileExt(name) {
    const m = /\.([^.]+)$/.exec(name);
    return m ? m[1].toLowerCase() : '';
  }

  function downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function downloadZip(files) {
    // files: [{name, content}]
    const zip = new JSZip();
    files.forEach(f => zip.file(f.name, f.content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-output.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.ConvUtils = { humanSize, mdFileName, fileExt, downloadBlob, downloadZip };
})();
