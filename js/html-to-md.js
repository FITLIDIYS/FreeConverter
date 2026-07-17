// html-to-md.js — HTML -> Markdown conversion, exposed on window.HtmlToMd
(function () {
  function makeTurndown(useGfm) {
    const td = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      hr: '---',
      emDelimiter: '_'
    });
    if (useGfm && window.turndownPluginGfm) {
      td.use(window.turndownPluginGfm.gfm);
    }
    return td;
  }

  /**
   * Convert raw HTML text into Markdown.
   * @param {string} rawHtml
   * @param {{gfm:boolean, frontmatter:boolean, stripNav:boolean}} options
   * @returns {string} markdown
   */
  function convert(rawHtml, options) {
    const opts = Object.assign({ gfm: true, frontmatter: true, stripNav: false }, options || {});

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    if (opts.stripNav) {
      doc.querySelectorAll('nav, header, footer, script, style, noscript').forEach(el => el.remove());
    } else {
      doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    }

    const root = doc.body || doc.documentElement;
    const td = makeTurndown(opts.gfm);
    let md = td.turndown(root.innerHTML);

    if (opts.frontmatter) {
      const title = (doc.title || '').trim();
      const alreadyH1 = /^\s*#\s+/.test(md);
      if (title && !alreadyH1) {
        md = '# ' + title + '\n\n' + md;
      }
    }

    return md.trim() + '\n';
  }

  window.HtmlToMd = { convert };
})();
