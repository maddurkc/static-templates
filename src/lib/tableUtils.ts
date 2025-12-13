export interface CellStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  fontSize?: string;
}

export interface HeaderStyle {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
}

export type CellPadding = 'small' | 'medium' | 'large';

export interface TableData {
  rows: string[][];
  showBorder: boolean;
  borderColor?: string;
  mergedCells: Record<string, { rowSpan: number; colSpan: number }>;
  cellStyles?: Record<string, CellStyle>; // key format: "rowIndex-colIndex"
  headerStyle?: HeaderStyle;
  columnWidths?: string[]; // e.g., ['100px', '200px', 'auto']
  cellPadding?: CellPadding; // small: 4px, medium: 8px, large: 12px
  isStatic?: boolean; // If true, table is static (manual data). If false, can be populated from JSON/API
  jsonMapping?: {
    enabled: boolean;
    columnMappings: { header: string; jsonPath: string }[];
  };
}

const getPaddingValue = (padding?: CellPadding): string => {
  switch (padding) {
    case 'small': return '4px';
    case 'large': return '12px';
    case 'medium':
    default: return '8px';
  }
};

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

// Parse JSON data and map to table rows based on column mappings
export const mapJsonToTableData = (
  jsonData: any[],
  columnMappings: { header: string; jsonPath: string }[]
): string[][] => {
  const headers = columnMappings.map(m => m.header);
  const rows: string[][] = [headers];
  
  jsonData.forEach(item => {
    const row = columnMappings.map(mapping => {
      const value = getValueByPath(item, mapping.jsonPath);
      return value !== undefined && value !== null ? String(value) : '';
    });
    rows.push(row);
  });
  
  return rows;
};

// Get nested value from object using dot notation path
export const getValueByPath = (obj: any, path: string): any => {
  if (!path) return obj;
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    // Handle array index notation like items[0]
    const match = key.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      return acc[match[1]]?.[parseInt(match[2])];
    }
    return acc[key];
  }, obj);
};

export const generateTableHTML = (tableData: TableData): string => {
  const borderColor = tableData.borderColor || '#ddd';
  const paddingValue = getPaddingValue(tableData.cellPadding);
  const borderStyle = tableData.showBorder ? ` border="1" style="border-collapse: collapse; border: 1px solid ${borderColor};"` : ' style="border-collapse: collapse;"';
  const baseCellStyle = tableData.showBorder 
    ? `border: 1px solid ${borderColor}; padding: ${paddingValue};` 
    : `padding: ${paddingValue};`;
  
  let html = `<table${borderStyle}>`;
  
  // Add colgroup for column widths if defined
  if (tableData.columnWidths && tableData.columnWidths.length > 0) {
    html += '<colgroup>';
    tableData.columnWidths.forEach((width) => {
      html += `<col style="width: ${width};">`;
    });
    html += '</colgroup>';
  }
  
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
      
      // Header styling - use custom header style or defaults
      let headerStyle = '';
      if (rowIndex === 0) {
        const hs = tableData.headerStyle;
        const bgColor = hs?.backgroundColor || '#f5f5f5';
        const textColor = hs?.textColor || 'inherit';
        const fontWeight = hs?.bold !== false ? 'bold' : 'normal';
        headerStyle = `background-color: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight};`;
      }
      
      // Add column width to cell style if defined
      const columnWidth = tableData.columnWidths?.[colIndex];
      const widthStyle = columnWidth ? `width: ${columnWidth};` : '';
      
      const fullStyle = `${baseCellStyle} ${headerStyle} ${customStyles} ${widthStyle}`.trim();
      
      html += `<${tag} style="${fullStyle}"${mergeAttrs}>${cell}</${tag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
};
