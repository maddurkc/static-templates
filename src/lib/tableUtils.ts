export interface CellStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  cellPadding?: string;
}

export interface HeaderStyle {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
}

export type CellPadding = 'small' | 'medium' | 'large';

export type HeaderPosition = 'first-row' | 'first-column' | 'none';

export interface TableData {
  headers?: string[]; // Separate header values (e.g., ['Header 1', 'Header 2'])
  rows: string[][];
  showBorder: boolean;
  borderColor?: string;
  mergedCells: Record<string, { rowSpan: number; colSpan: number }>;
  cellStyles?: Record<string, CellStyle>; // key format: "h-colIndex" for headers, "rowIndex-colIndex" for data rows
  headerStyle?: HeaderStyle;
  columnWidths?: string[]; // e.g., ['100px', '200px', 'auto']
  cellPadding?: CellPadding; // small: 4px, medium: 8px, large: 12px
  isStatic?: boolean; // If true, table is static (manual data). If false, can be populated from JSON/API
  tableVariableName?: string; // Variable name for dynamic th:each collection (e.g., "tableRows_abc123")
  headerVariableName?: string; // Variable name for dynamic th:each headers (e.g., "tableHeaders_abc123")
  headerPosition?: HeaderPosition; // Where headers are: first-row (default), first-column, or none
  jsonMapping?: {
    enabled: boolean;
    columnMappings: { header: string; jsonPath: string }[];
  };
}

// Generate a unique variable name for a table's collection
export const generateTableVariableName = (sectionId: string): string => {
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '_');
  return `tableRows_${cleanId}`;
};

// Generate a unique variable name for a table's headers
export const generateHeaderVariableName = (sectionId: string): string => {
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '_');
  return `tableHeaders_${cleanId}`;
};

// Generate Thymeleaf-compatible table HTML with th:each for dynamic tables
export const generateThymeleafDynamicTableHTML = (tableData: TableData, sectionId: string): string => {
  if (!tableData || !tableData.jsonMapping?.columnMappings?.length) {
    return '<table><tr><td>No column mappings defined</td></tr></table>';
  }

  const headerPosition = tableData.headerPosition || 'first-row';
  const variableName = tableData.tableVariableName || generateTableVariableName(sectionId);
  const headerVarName = tableData.headerVariableName || generateHeaderVariableName(sectionId);
  const mappings = tableData.jsonMapping.columnMappings;
  const borderColor = tableData.borderColor || '#ddd';
  const showBorder = tableData.showBorder;
  const borderStyle = showBorder ? `border: 1px solid ${borderColor};` : '';
  const paddingValue = getPaddingValue(tableData.cellPadding);

  // Header styling
  const hs = tableData.headerStyle;
  const bgColor = hs?.backgroundColor || '#FFC000';
  const textColor = hs?.textColor || 'inherit';
  const fontWeight = hs?.bold !== false ? 'bold' : 'normal';
  const headerCellStyle = `padding: ${paddingValue}; ${borderStyle} background-color: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight};`;
  const bodyCellStyle = `padding: ${paddingValue}; ${borderStyle}`;

  let html = `<table style="width: 100%; border-collapse: collapse; ${borderStyle}">`;

  // Colgroup for widths
  if (tableData.columnWidths && tableData.columnWidths.length > 0) {
    html += '<colgroup>';
    tableData.columnWidths.forEach((width) => {
      html += `<col style="width: ${width};">`;
    });
    html += '</colgroup>';
  }

  if (headerPosition === 'first-row') {
    // Header row with th:each
    html += '<thead><tr>';
    html += `<th th:each="header : \${${headerVarName}}" th:style="\${header.style}" style="${headerCellStyle}"><span th:utext="\${header.value}"/></th>`;
    html += '</tr></thead>';

    // Body rows with th:each, columns also dynamic
    html += '<tbody>';
    html += `<tr th:each="row : \${${variableName}}">`;
    html += `<td th:each="cell : \${row.cells}" th:style="\${cell.style}" style="${bodyCellStyle}"><span th:utext="\${cell.value}"/></td>`;
    html += '</tr>';
    html += '</tbody>';
  } else if (headerPosition === 'first-column') {
    // Each row: <th>header</th><td>value</td> — key-value style
    html += '<tbody>';
    html += `<tr th:each="row : \${${variableName}}">`;
    html += `<th th:style="\${row.header_style}" style="${headerCellStyle}"><span th:utext="\${row.header}"/></th>`;
    html += `<td th:style="\${row.value_style}" style="${bodyCellStyle}"><span th:utext="\${row.value}"/></td>`;
    html += '</tr>';
    html += '</tbody>';
  } else {
    // No headers — all cells are <td>, also dynamic
    html += '<tbody>';
    html += `<tr th:each="row : \${${variableName}}">`;
    html += `<td th:each="cell : \${row.cells}" th:style="\${cell.style}" style="${bodyCellStyle}"><span th:utext="\${cell.value}"/></td>`;
    html += '</tr>';
    html += '</tbody>';
  }

  html += '</table>';
  return html;
};

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
  if (style.textAlign) styles.push(`text-align: ${style.textAlign}`);
  if (style.verticalAlign) styles.push(`vertical-align: ${style.verticalAlign}`);
  if (style.cellPadding) styles.push(`padding: ${style.cellPadding}`);
  
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
  // Guard against undefined/null tableData
  if (!tableData || !tableData.rows) {
    return '<table><tr><td>No data</td></tr></table>';
  }
  
  const headerPosition = tableData.headerPosition || 'first-row';
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
  if (tableData.mergedCells && typeof tableData.mergedCells === 'object') {
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
  }

  // Build header style string
  const buildHeaderStyleString = (): string => {
    const hs = tableData.headerStyle;
    const bgColor = hs?.backgroundColor || '#FFC000';
    const textColor = hs?.textColor || 'inherit';
    const fontWeight = hs?.bold !== false ? 'bold' : 'normal';
    return `background-color: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight};`;
  };

  // Render separate headers row if available
  if (tableData.headers && headerPosition === 'first-row') {
    html += '<tr>';
    tableData.headers.forEach((header, colIndex) => {
      const cellStyle = tableData.cellStyles?.[`h-${colIndex}`];
      const customStyles = generateCellStyleString(cellStyle);
      const columnWidth = tableData.columnWidths?.[colIndex];
      const widthStyle = columnWidth ? `width: ${columnWidth};` : '';
      const allParts = [baseCellStyle, buildHeaderStyleString(), customStyles, widthStyle].filter(s => s.length > 0);
      const fullStyle = allParts.map(s => s.endsWith(';') ? s : s + ';').join(' ').trim();
      html += `<th style="${fullStyle}">${header}</th>`;
    });
    html += '</tr>';
  }

  tableData.rows.forEach((row, rowIndex) => {
    html += '<tr>';
    row.forEach((cell, colIndex) => {
      const cellKey = `${rowIndex}-${colIndex}`;
      
      // Skip if this cell is part of a merged cell
      if (skipCells.has(cellKey)) {
        return;
      }
      
      const merge = tableData.mergedCells?.[cellKey];
      
      // Determine if this cell is a header based on headerPosition (only first-column now, first-row handled above)
      const isHeaderCell = (headerPosition === 'first-column' && colIndex === 0);
      
      const tag = isHeaderCell ? 'th' : 'td';
      const mergeAttrs = merge 
        ? ` rowspan="${merge.rowSpan}" colspan="${merge.colSpan}"`
        : '';
      
      // Get cell-specific styles
      const cellStyle = tableData.cellStyles?.[cellKey];
      const customStyles = generateCellStyleString(cellStyle);
      
      // Header styling
      let headerStyleStr = '';
      if (isHeaderCell) {
        headerStyleStr = buildHeaderStyleString();
      }
      
      // Add column width to cell style if defined
      const columnWidth = tableData.columnWidths?.[colIndex];
      const widthStyle = columnWidth ? `width: ${columnWidth};` : '';
      
      const allParts = [baseCellStyle, headerStyleStr, customStyles, widthStyle].filter(s => s.length > 0);
      const fullStyle = allParts.map(s => s.endsWith(';') ? s : s + ';').join(' ').trim();
      
      html += `<${tag} style="${fullStyle}"${mergeAttrs}>${cell}</${tag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
};
