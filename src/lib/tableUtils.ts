export interface CellStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  fontSize?: string;
}

export interface TableData {
  rows: string[][];
  showBorder: boolean;
  borderColor?: string;
  mergedCells: Record<string, { rowSpan: number; colSpan: number }>;
  cellStyles?: Record<string, CellStyle>; // key format: "rowIndex-colIndex"
}

export const generateCellStyleString = (style?: CellStyle): string => {
  if (!style) return '';
  
  const styles: string[] = [];
  if (style.color) styles.push(`color: ${style.color}`);
  if (style.bold) styles.push('font-weight: bold');
  if (style.italic) styles.push('font-style: italic');
  if (style.underline) styles.push('text-decoration: underline');
  if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
  if (style.fontSize) styles.push(`font-size: ${style.fontSize}`);
  
  return styles.join('; ');
};

export const generateTableHTML = (tableData: TableData): string => {
  const borderColor = tableData.borderColor || '#ddd';
  const borderStyle = tableData.showBorder ? ` border="1" style="border-collapse: collapse; border: 1px solid ${borderColor};"` : ' style="border-collapse: collapse;"';
  const baseCellStyle = tableData.showBorder 
    ? `border: 1px solid ${borderColor}; padding: 8px;` 
    : 'padding: 8px;';
  
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
      
      // Get cell-specific styles
      const cellStyle = tableData.cellStyles?.[cellKey];
      const customStyles = generateCellStyleString(cellStyle);
      const headerStyle = rowIndex === 0 ? 'background-color: #f5f5f5; font-weight: bold;' : '';
      const fullStyle = `${baseCellStyle} ${headerStyle} ${customStyles}`.trim();
      
      html += `<${tag} style="${fullStyle}"${mergeAttrs}>${cell}</${tag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
};
