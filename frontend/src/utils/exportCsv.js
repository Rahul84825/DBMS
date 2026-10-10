/**
 * Generates and downloads a CSV file from an array of objects
 * @param {Array<Object>} data - Array of row objects
 * @param {string} filename - Filename to save as (e.g., 'harvest_report.csv')
 * @param {Array<{key: string, label: string}>} columns - Column mappings
 */
export function exportToCsv(data, filename = 'export.csv', columns = null) {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  // Determine headers
  let headers = [];
  if (columns && columns.length > 0) {
    headers = columns;
  } else {
    headers = Object.keys(data[0]).map((key) => ({ key, label: key }));
  }

  const csvRows = [];

  // Header row
  csvRows.push(headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h.key];
      if (val === null || val === undefined) return '""';
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
