const XLSX = null;

function csvEscape(value) {
  const v = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(v)) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function generateCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const v = row[c] ?? '';
        return csvEscape(v);
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

function generateExcelLikeHtmlTable(rows, columns) {
  // Production-safe fallback without adding heavy deps.
  // Browsers can download this as .xls.
  const thead = `<tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const tbody = rows
    .map((row) => {
      return `<tr>${columns
        .map((c) => {
          const v = row[c] ?? '';
          return `<td>${String(v).replace(/&/g, '&amp;').replace(/</g, '<')}</td>`;
        })
        .join('')}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table>${thead}${tbody}</table></body></html>`;
}

module.exports = {
  generateCsv,
  generateExcelLikeHtmlTable,
};

