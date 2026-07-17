// pdf-to-md.js — PDF -> Markdown conversion, exposed on window.PdfToMd
(function () {
  if (window['pdfjsLib']) {
    window['pdfjsLib'].GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Group text items on a page into lines based on their Y position.
  function groupIntoLines(items) {
    const lines = [];
    let current = null;
    let lastY = null;

    items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (lastY === null || Math.abs(y - lastY) > 2) {
        current = { y, items: [] };
        lines.push(current);
        lastY = y;
      }
      current.items.push(item);
    });

    // PDF y-coordinates increase upward; sort lines top-to-bottom.
    lines.sort((a, b) => b.y - a.y);
    return lines.map(line => {
      const text = line.items.map(i => i.str).join('').replace(/\s+/g, ' ').trim();
      const heights = line.items.map(i => i.height || i.transform[0] || 0);
      const maxHeight = heights.length ? Math.max(...heights) : 0;
      return { text, height: maxHeight };
    }).filter(l => l.text.length > 0);
  }

  function averageHeight(allLines) {
    if (allLines.length === 0) return 0;
    const sum = allLines.reduce((acc, l) => acc + l.height, 0);
    return sum / allLines.length;
  }

  function lineToMarkdown(line, avgHeight, detectHeadings) {
    let text = line.text;
    if (detectHeadings && avgHeight > 0 && line.height >= avgHeight * 1.15) {
      const ratio = line.height / avgHeight;
      if (ratio >= 1.6) return '# ' + text;
      if (ratio >= 1.4) return '## ' + text;
      if (ratio >= 1.15) return '### ' + text;
    }
    return text;
  }

  /**
   * Convert a PDF (as ArrayBuffer) into Markdown text.
   * @param {ArrayBuffer} arrayBuffer
   * @param {{detectHeadings:boolean, pageBreaks:boolean}} options
   * @param {(pageNum:number, total:number)=>void} onProgress
   * @returns {Promise<string>} markdown
   */
  async function convert(arrayBuffer, options, onProgress) {
    const opts = Object.assign({ detectHeadings: true, pageBreaks: true }, options || {});
    const loadingTask = window['pdfjsLib'].getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageChunks = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines = groupIntoLines(textContent.items);
      const avgHeight = averageHeight(lines);

      const mdLines = [];
      let prevWasHeading = false;
      lines.forEach(line => {
        const rendered = lineToMarkdown(line, avgHeight, opts.detectHeadings);
        const isHeading = rendered.startsWith('#');
        if (isHeading && mdLines.length > 0) mdLines.push('');
        mdLines.push(rendered);
        if (isHeading) mdLines.push('');
        prevWasHeading = isHeading;
      });

      let pageMd = mdLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

      if (opts.pageBreaks) {
        pageMd = `## Page ${pageNum}\n\n${pageMd}`;
      }

      pageChunks.push(pageMd);

      if (onProgress) onProgress(pageNum, pdf.numPages);
    }

    const separator = opts.pageBreaks ? '\n\n---\n\n' : '\n\n';
    return pageChunks.join(separator).trim() + '\n';
  }

  window.PdfToMd = { convert };
})();
