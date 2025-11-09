export interface TableData {
  rows: string[][];
  showBorder: boolean;
  mergedCells: Record<string, { rowSpan: number; colSpan: number }>;
}

export const generateTableHTML = (tableData: TableData): string => {
  const borderStyle = tableData.showBorder ? ' border="1" style="border-collapse: collapse;"' : '';
  const cellStyle = tableData.showBorder ? ' style="border: 1px solid #ddd; padding: 8px;"' : ' style="padding: 8px;"';
  
  let html = `<table${borderStyle}>`;
  
  // Track which cells should be skipped (already part of a merged cell)
  const skipCells = new Set<string>();
  
  // Build merged cells skip set
  Object.entries(tableData.mergedCells).forEach(([key, merge]) => {
    const [startRow, startCol] = key.split('-').map(Number);
    for (let r = startRow; r < startRow + merge.rowSpan; r++) {
      for (let c = startCol; c < startCol + merge.colSpan; c++) {
        if (r !== startRow || c !== startCol) {
          skipCells.add(`${r}-${c}`);
        }
      }
    }
  });
  
  tableData.rows.forEach((row, rowIndex) => {
    html += '<tr>';
    row.forEach((cell, colIndex) => {
      const cellKey = `${rowIndex}-${colIndex}`;
      
      // Skip if this cell is part of a merged cell
      if (skipCells.has(cellKey)) {
        return;
      }
      
      const merge = tableData.mergedCells[cellKey];
      const tag = rowIndex === 0 ? 'th' : 'td';
      const mergeAttrs = merge 
        ? ` rowspan="${merge.rowSpan}" colspan="${merge.colSpan}"`
        : '';
      
      html += `<${tag}${cellStyle}${mergeAttrs}>${cell}</${tag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
};
