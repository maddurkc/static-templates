import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Plus, Trash2, Merge, Bold, Italic, Underline, Database, FileJson,
  Settings2, Rows3, Columns3, ArrowUpFromLine, ArrowDownFromLine,
  ArrowLeftFromLine, ArrowRightFromLine, Palette, Grid3X3, Zap,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowUpToLine, ArrowDownToLine, Minus, Type, Upload
} from "lucide-react";
import * as XLSX from "xlsx";
import { Section } from "@/types/section";
import { TableData, CellStyle, HeaderStyle, CellPadding, mapJsonToTableData, generateTableVariableName } from "@/lib/tableUtils";
import { toast } from "sonner";
import styles from "./TableEditor.module.scss";

const TEXT_COLORS = ['#000000', '#FF0000', '#0066CC', '#008000', '#FF6600', '#800080', '#666666', '#003366'];
const BG_COLORS = ['#FFFFFF', '#FFFF00', '#90EE90', '#ADD8E6', '#FFB6C1', '#E6E6FA', '#F5F5DC', '#F0F0F0'];

interface TableEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
  hideStructuralControls?: boolean;
}

export const TableEditor = ({ section, onUpdate, hideStructuralControls = false }: TableEditorProps) => {
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseTableData = useCallback((): TableData => {
    try {
      const data = section.variables?.tableData as any;
      if (data && typeof data === 'object') {
        const rows = data.rows || [['Header 1', 'Header 2'], ['Data 1', 'Data 2']];
        return {
          rows,
          showBorder: data.showBorder !== false,
          borderColor: data.borderColor || '#ddd',
          mergedCells: data.mergedCells || {},
          cellStyles: data.cellStyles || {},
          headerStyle: data.headerStyle || { backgroundColor: '#FFC000', textColor: '#000000', bold: true },
          columnWidths: data.columnWidths || new Array(rows[0]?.length || 2).fill('auto'),
          cellPadding: data.cellPadding || 'medium',
          isStatic: data.isStatic === true ? true : false,
          tableVariableName: data.tableVariableName,
          jsonMapping: data.jsonMapping || { enabled: false, columnMappings: [] }
        };
      }
    } catch (e) {
      console.error('Error parsing table data:', e);
    }
    return {
      rows: [['Header 1', 'Header 2'], ['Data 1', 'Data 2']],
      showBorder: true, borderColor: '#ddd', mergedCells: {}, cellStyles: {},
      headerStyle: { backgroundColor: '#FFC000', textColor: '#000000', bold: true },
      columnWidths: ['auto', 'auto'], cellPadding: 'medium', isStatic: false,
      jsonMapping: { enabled: false, columnMappings: [] }
    };
  }, [section.id, section.variables?.tableData]);

  const [tableData, setTableData] = useState<TableData>(parseTableData());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    setTableData(parseTableData());
  }, [parseTableData]);

  const updateTableData = (newData: TableData) => {
    setTableData(newData);
    onUpdate({ ...section, variables: { ...section.variables, tableData: newData } });
  };

  // ── Row/Col Operations ──
  const insertRowAbove = () => {
    if (!selectedCell) return;
    const newRow = new Array(tableData.rows[0]?.length || 2).fill('');
    const newRows = [...tableData.rows];
    newRows.splice(selectedCell.row, 0, newRow);
    updateTableData({ ...tableData, rows: newRows });
    setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
  };

  const insertRowBelow = () => {
    const insertAt = selectedCell ? selectedCell.row + 1 : tableData.rows.length;
    const newRow = new Array(tableData.rows[0]?.length || 2).fill('');
    const newRows = [...tableData.rows];
    newRows.splice(insertAt, 0, newRow);
    updateTableData({ ...tableData, rows: newRows });
  };

  const deleteRow = () => {
    if (!selectedCell || tableData.rows.length <= 1) return;
    const newRows = tableData.rows.filter((_, i) => i !== selectedCell.row);
    const newCellStyles = { ...tableData.cellStyles };
    Object.keys(newCellStyles).forEach(key => {
      const [r] = key.split('-').map(Number);
      if (r === selectedCell.row) delete newCellStyles[key];
      else if (r > selectedCell.row) {
        const [, c] = key.split('-').map(Number);
        delete newCellStyles[key];
        newCellStyles[`${r - 1}-${c}`] = tableData.cellStyles![key];
      }
    });
    setSelectedCell(null);
    updateTableData({ ...tableData, rows: newRows, cellStyles: newCellStyles });
  };

  const insertColumnLeft = () => {
    if (!selectedCell) return;
    const newRows = tableData.rows.map(row => {
      const r = [...row]; r.splice(selectedCell.col, 0, ''); return r;
    });
    const newWidths = [...(tableData.columnWidths || [])];
    newWidths.splice(selectedCell.col, 0, 'auto');
    updateTableData({ ...tableData, rows: newRows, columnWidths: newWidths });
    setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
  };

  const insertColumnRight = () => {
    const insertAt = selectedCell ? selectedCell.col + 1 : (tableData.rows[0]?.length || 0);
    const newRows = tableData.rows.map(row => {
      const r = [...row]; r.splice(insertAt, 0, ''); return r;
    });
    const newWidths = [...(tableData.columnWidths || [])];
    newWidths.splice(insertAt, 0, 'auto');
    updateTableData({ ...tableData, rows: newRows, columnWidths: newWidths });
  };

  const deleteColumn = () => {
    if (!selectedCell || tableData.rows[0]?.length <= 1) return;
    const ci = selectedCell.col;
    const newRows = tableData.rows.map(row => row.filter((_, i) => i !== ci));
    const newCellStyles = { ...tableData.cellStyles };
    Object.keys(newCellStyles).forEach(key => {
      const [r, c] = key.split('-').map(Number);
      if (c === ci) delete newCellStyles[key];
      else if (c > ci) { delete newCellStyles[key]; newCellStyles[`${r}-${c - 1}`] = tableData.cellStyles![key]; }
    });
    const newWidths = tableData.columnWidths?.filter((_, i) => i !== ci);
    setSelectedCell(null);
    updateTableData({ ...tableData, rows: newRows, cellStyles: newCellStyles, columnWidths: newWidths });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = tableData.rows.map((row, rIdx) =>
      rIdx === rowIndex ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell) : [...row]
    );
    updateTableData({ ...tableData, rows: newRows });
  };

  const updateColumnWidth = (colIndex: number, width: string) => {
    const newWidths = [...(tableData.columnWidths || [])];
    while (newWidths.length <= colIndex) newWidths.push('auto');
    newWidths[colIndex] = width;
    updateTableData({ ...tableData, columnWidths: newWidths });
  };

  const toggleBorder = () => updateTableData({ ...tableData, showBorder: !tableData.showBorder });
  const updateBorderColor = (color: string) => updateTableData({ ...tableData, borderColor: color });
  const updateHeaderStyle = (updates: Partial<HeaderStyle>) => updateTableData({ ...tableData, headerStyle: { ...tableData.headerStyle, ...updates } });
  const updateCellPadding = (padding: CellPadding) => updateTableData({ ...tableData, cellPadding: padding });

  // ── Merge ──
  const mergeCells = () => {
    if (!selectedCell) return;
    const cellKey = `${selectedCell.row}-${selectedCell.col}`;
    const currentMerge = tableData.mergedCells[cellKey];
    if (currentMerge) {
      const newMergedCells = { ...tableData.mergedCells };
      delete newMergedCells[cellKey];
      updateTableData({ ...tableData, mergedCells: newMergedCells });
    } else {
      updateTableData({ ...tableData, mergedCells: { ...tableData.mergedCells, [cellKey]: { rowSpan: 1, colSpan: 2 } } });
    }
  };

  const isCellMerged = (rowIndex: number, colIndex: number) => {
    for (const [key, merge] of Object.entries(tableData.mergedCells)) {
      const [mergeRow, mergeCol] = key.split('-').map(Number);
      if (rowIndex >= mergeRow && rowIndex < mergeRow + merge.rowSpan &&
          colIndex >= mergeCol && colIndex < mergeCol + merge.colSpan &&
          (rowIndex !== mergeRow || colIndex !== mergeCol)) return true;
    }
    return false;
  };

  const getCellMerge = (rowIndex: number, colIndex: number) => tableData.mergedCells[`${rowIndex}-${colIndex}`];
  const getCellStyle = (rowIndex: number, colIndex: number): CellStyle => tableData.cellStyles?.[`${rowIndex}-${colIndex}`] || {};

  const updateCellStyle = (rowIndex: number, colIndex: number, style: Partial<CellStyle>) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    updateTableData({ ...tableData, cellStyles: { ...tableData.cellStyles, [cellKey]: { ...getCellStyle(rowIndex, colIndex), ...style } } });
  };

  const toggleCellStyle = (rowIndex: number, colIndex: number, property: keyof CellStyle) => {
    const currentStyle = getCellStyle(rowIndex, colIndex);
    updateCellStyle(rowIndex, colIndex, { [property]: !currentStyle[property] });
  };

  // ── Static/Dynamic ──
  const toggleStaticMode = (isStatic: boolean) => {
    const updates: Partial<TableData> = { isStatic };
    if (!isStatic) {
      const varName = tableData.tableVariableName || generateTableVariableName(section.id);
      updates.tableVariableName = varName;
      if (!tableData.jsonMapping?.columnMappings?.length && tableData.rows[0]?.length) {
        const columnMappings = tableData.rows[0].map(header => ({
          header: header || 'Column',
          jsonPath: header ? header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : 'field'
        }));
        updates.jsonMapping = { enabled: true, columnMappings };
      }
    }
    updateTableData({ ...tableData, ...updates });
  };

  const updateJsonMapping = (columnMappings: { header: string; jsonPath: string }[]) => {
    updateTableData({ ...tableData, jsonMapping: { enabled: true, columnMappings } });
  };

  const importJsonData = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];
      if (dataArray.length === 0) { toast.error('JSON data is empty'); return; }
      const firstItem = dataArray[0];
      const keys = Object.keys(firstItem);
      if (keys.length === 0) { toast.error('No properties found in JSON data'); return; }
      const columnMappings = keys.map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), jsonPath: key
      }));
      const rows = mapJsonToTableData(dataArray, columnMappings);
      updateTableData({
        ...tableData, rows, columnWidths: new Array(columnMappings.length).fill('auto'),
        jsonMapping: { enabled: true, columnMappings }, isStatic: false,
        tableVariableName: tableData.tableVariableName || generateTableVariableName(section.id)
      });
      setJsonInput(''); setShowJsonImport(false);
      toast.success(`Imported ${dataArray.length} rows with ${keys.length} columns`);
    } catch { toast.error('Invalid JSON format'); }
  };

  const importFileData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const isCSV = file.name.toLowerCase().endsWith('.csv');

    reader.onload = (evt) => {
      try {
        let rows: string[][] = [];
        if (isCSV) {
          const text = evt.target?.result as string;
          rows = text.split(/\r?\n/).filter(line => line.trim()).map(line => {
            // Simple CSV parse handling quoted fields
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') { inQuotes = !inQuotes; }
              else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
              else { current += ch; }
            }
            result.push(current.trim());
            return result;
          });
        } else {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
            .filter((row: string[]) => row.some(cell => String(cell).trim() !== ''));
          rows = rows.map(row => row.map(cell => String(cell)));
        }

        if (rows.length < 1) { toast.error('File is empty'); return; }

        const headers = rows[0];
        const columnMappings = headers.map(h => ({
          header: h || 'Column',
          jsonPath: h ? h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : 'field'
        }));

        updateTableData({
          ...tableData,
          rows,
          columnWidths: new Array(headers.length).fill('auto'),
          jsonMapping: { enabled: true, columnMappings },
          isStatic: false,
          tableVariableName: tableData.tableVariableName || generateTableVariableName(section.id)
        });

        toast.success(`Imported ${rows.length - 1} data rows with ${headers.length} columns from ${file.name}`);
      } catch (err) {
        console.error('File import error:', err);
        toast.error('Failed to parse file. Ensure it is a valid CSV or Excel file.');
      }
    };

    if (isCSV) { reader.readAsText(file); }
    else { reader.readAsArrayBuffer(file); }

    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const addColumnMapping = () => {
    const cur = tableData.jsonMapping?.columnMappings || [];
    updateJsonMapping([...cur, { header: `Column ${cur.length + 1}`, jsonPath: '' }]);
  };

  const updateColumnMapping = (index: number, field: 'header' | 'jsonPath', value: string) => {
    const cur = [...(tableData.jsonMapping?.columnMappings || [])];
    cur[index] = { ...cur[index], [field]: value };
    updateJsonMapping(cur);
  };

  const removeColumnMapping = (index: number) => {
    updateJsonMapping((tableData.jsonMapping?.columnMappings || []).filter((_, i) => i !== index));
  };

  const selectedCellStyle = selectedCell ? getCellStyle(selectedCell.row, selectedCell.col) : {};
  const isDynamic = tableData.isStatic === false;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={styles.container}>
        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          {/* Row operations */}
          <Tooltip><TooltipTrigger asChild>
            <button className={styles.toolbarBtn} onClick={insertRowAbove} disabled={!selectedCell}><ArrowUpFromLine size={14} /></button>
          </TooltipTrigger><TooltipContent side="bottom">Insert row above</TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild>
            <button className={styles.toolbarBtn} onClick={insertRowBelow}><ArrowDownFromLine size={14} /></button>
          </TooltipTrigger><TooltipContent side="bottom">Insert row below</TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild>
            <button className={styles.toolbarBtn} onClick={deleteRow} disabled={!selectedCell || tableData.rows.length <= 1}><Rows3 size={14} /></button>
          </TooltipTrigger><TooltipContent side="bottom">Delete row</TooltipContent></Tooltip>

          <div className={styles.toolbarDivider} />

          {/* Column operations */}
          {!hideStructuralControls && (
            <>
              <Tooltip><TooltipTrigger asChild>
                <button className={styles.toolbarBtn} onClick={insertColumnLeft} disabled={!selectedCell}><ArrowLeftFromLine size={14} /></button>
              </TooltipTrigger><TooltipContent side="bottom">Insert column left</TooltipContent></Tooltip>

              <Tooltip><TooltipTrigger asChild>
                <button className={styles.toolbarBtn} onClick={insertColumnRight}><ArrowRightFromLine size={14} /></button>
              </TooltipTrigger><TooltipContent side="bottom">Insert column right</TooltipContent></Tooltip>

              <Tooltip><TooltipTrigger asChild>
                <button className={styles.toolbarBtn} onClick={deleteColumn} disabled={!selectedCell || (tableData.rows[0]?.length || 0) <= 1}><Columns3 size={14} /></button>
              </TooltipTrigger><TooltipContent side="bottom">Delete column</TooltipContent></Tooltip>

              <div className={styles.toolbarDivider} />

              {/* Merge */}
              <Tooltip><TooltipTrigger asChild>
                <button className={`${styles.toolbarBtn} ${selectedCell && getCellMerge(selectedCell.row, selectedCell.col) ? styles.active : ''}`}
                  onClick={mergeCells} disabled={!selectedCell}><Merge size={14} /></button>
              </TooltipTrigger><TooltipContent side="bottom">Merge / Unmerge cells</TooltipContent></Tooltip>

              <div className={styles.toolbarDivider} />

              {/* Border toggle */}
              <Tooltip><TooltipTrigger asChild>
                <button className={`${styles.toolbarBtn} ${tableData.showBorder ? styles.active : ''}`} onClick={toggleBorder}>
                  <Grid3X3 size={14} />
                </button>
              </TooltipTrigger><TooltipContent side="bottom">Toggle borders</TooltipContent></Tooltip>
            </>
          )}

          {/* Cell properties popover */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className={styles.toolbarBtn} disabled={!selectedCell}><Type size={14} /></button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Cell properties</TooltipContent>
            </Tooltip>
            <PopoverContent className="p-3 bg-popover border shadow-lg z-50 w-72" align="start" side="bottom">
              {selectedCell && (
                <div className={styles.propsPanel}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: 'hsl(var(--foreground))' }}>
                    Cell Properties
                    <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'hsl(var(--muted-foreground))', marginLeft: '0.5rem' }}>
                      R{selectedCell.row + 1}:C{selectedCell.col + 1}
                    </span>
                  </h4>

                  {/* Text formatting */}
                  <div className={styles.propGroup}>
                    <span className={styles.propSmallLabel}>Text Format</span>
                    <div style={{ display: 'flex', gap: '0.125rem' }}>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.bold ? styles.active : ''}`}
                        onClick={() => toggleCellStyle(selectedCell.row, selectedCell.col, 'bold')}><Bold size={13} /></button>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.italic ? styles.active : ''}`}
                        onClick={() => toggleCellStyle(selectedCell.row, selectedCell.col, 'italic')}><Italic size={13} /></button>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.underline ? styles.active : ''}`}
                        onClick={() => toggleCellStyle(selectedCell.row, selectedCell.col, 'underline')}><Underline size={13} /></button>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div className={styles.propGroup}>
                    <span className={styles.propSmallLabel}>Text Color</span>
                    <div className={styles.colorSwatches}>
                      {TEXT_COLORS.map(color => (
                        <button key={color} className={`${styles.colorSwatch} ${selectedCellStyle.color === color ? styles.activeSwatch : ''}`}
                          style={{ backgroundColor: color }} onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { color })}
                          title={color} />
                      ))}
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className={styles.propGroup}>
                    <span className={styles.propSmallLabel}>Background</span>
                    <div className={styles.colorSwatches}>
                      {BG_COLORS.map(color => (
                        <button key={color} className={`${styles.colorSwatch} ${selectedCellStyle.backgroundColor === color ? styles.activeSwatch : ''}`}
                          style={{ backgroundColor: color }} onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { backgroundColor: color })}
                          title={color} />
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className={styles.propRow}>
                    <span className={styles.propLabel}>Font Size</span>
                    <Select value={selectedCellStyle.fontSize || 'default'}
                      onValueChange={(v) => updateCellStyle(selectedCell.row, selectedCell.col, { fontSize: v === 'default' ? undefined : v })}>
                      <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="Default" /></SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="10px">10px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="14px">14px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="18px">18px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Alignment */}
                  <div className={styles.propGroup}>
                    <span className={styles.propSmallLabel}>Text Alignment</span>
                    <div style={{ display: 'flex', gap: '0.125rem' }}>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.textAlign === 'left' || !selectedCellStyle.textAlign ? styles.active : ''}`}
                        onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { textAlign: 'left' })}><AlignLeft size={13} /></button>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.textAlign === 'center' ? styles.active : ''}`}
                        onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { textAlign: 'center' })}><AlignCenter size={13} /></button>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.textAlign === 'right' ? styles.active : ''}`}
                        onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { textAlign: 'right' })}><AlignRight size={13} /></button>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.textAlign === 'justify' ? styles.active : ''}`}
                        onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { textAlign: 'justify' })}><AlignJustify size={13} /></button>
                      <div className={styles.toolbarDivider} />
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.verticalAlign === 'top' ? styles.active : ''}`}
                        onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { verticalAlign: 'top' })}><ArrowUpToLine size={13} /></button>
                      <button className={`${styles.toolbarBtn} ${!selectedCellStyle.verticalAlign || selectedCellStyle.verticalAlign === 'middle' ? styles.active : ''}`}
                        onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { verticalAlign: 'middle' })}><Minus size={13} /></button>
                      <button className={`${styles.toolbarBtn} ${selectedCellStyle.verticalAlign === 'bottom' ? styles.active : ''}`}
                        onClick={() => updateCellStyle(selectedCell.row, selectedCell.col, { verticalAlign: 'bottom' })}><ArrowDownToLine size={13} /></button>
                    </div>
                  </div>

                  {/* Cell Padding */}
                  <div className={styles.propRow}>
                    <span className={styles.propLabel}>Cell Padding</span>
                    <Input
                      value={selectedCellStyle.cellPadding || ''}
                      onChange={(e) => updateCellStyle(selectedCell.row, selectedCell.col, { cellPadding: e.target.value || undefined })}
                      placeholder="e.g. 8px"
                      className="h-7 text-xs w-24"
                    />
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Table properties popover */}
          {!hideStructuralControls && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className={styles.toolbarBtn}><Settings2 size={14} /></button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Table properties</TooltipContent>
            </Tooltip>
            <PopoverContent className="p-3 bg-popover border shadow-lg z-50" align="start" side="bottom">
              <div className={styles.propsPanel}>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: 'hsl(var(--foreground))' }}>Table Properties</h4>

                {/* Border color */}
                {tableData.showBorder && (
                  <div className={styles.propGroup}>
                    <span className={styles.propSmallLabel}>Border Color</span>
                    <div className={styles.propColorRow}>
                      <input type="color" value={tableData.borderColor || '#ddd'} onChange={(e) => updateBorderColor(e.target.value)} className={styles.colorInput} />
                      <Input value={tableData.borderColor || '#ddd'} onChange={(e) => updateBorderColor(e.target.value)} className="h-7 text-xs flex-1" />
                    </div>
                  </div>
                )}

                {/* Cell Padding */}
                <div className={styles.propRow}>
                  <span className={styles.propLabel}>Cell Padding</span>
                  <Select value={tableData.cellPadding || 'medium'} onValueChange={(v: CellPadding) => updateCellPadding(v)}>
                    <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Header styling */}
                <div className={styles.propGroup}>
                  <span className={styles.propSmallLabel}>Header Row</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>BG Color</span>
                      <div className={styles.colorSwatches}>
                        {BG_COLORS.map(color => (
                          <button key={color} className={`${styles.colorSwatch} ${tableData.headerStyle?.backgroundColor === color ? styles.activeSwatch : ''}`}
                            style={{ backgroundColor: color }} onClick={() => updateHeaderStyle({ backgroundColor: color })} title={color} />
                        ))}
                        {/* Include #FFC000 as a header-specific option */}
                        {!BG_COLORS.includes('#FFC000') && (
                          <button className={`${styles.colorSwatch} ${tableData.headerStyle?.backgroundColor === '#FFC000' ? styles.activeSwatch : ''}`}
                            style={{ backgroundColor: '#FFC000' }} onClick={() => updateHeaderStyle({ backgroundColor: '#FFC000' })} title="#FFC000" />
                        )}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>Text Color</span>
                      <div className={styles.colorSwatches}>
                        {TEXT_COLORS.map(color => (
                          <button key={color} className={`${styles.colorSwatch} ${tableData.headerStyle?.textColor === color ? styles.activeSwatch : ''}`}
                            style={{ backgroundColor: color }} onClick={() => updateHeaderStyle({ textColor: color })} title={color} />
                        ))}
                      </div>
                    </div>
                    <Tooltip><TooltipTrigger asChild>
                      <button className={`${styles.toolbarBtn} ${tableData.headerStyle?.bold !== false ? styles.active : ''}`}
                        onClick={() => updateHeaderStyle({ bold: !(tableData.headerStyle?.bold !== false) })} style={{ width: '1.5rem', height: '1.5rem' }}>
                        <Bold size={12} />
                      </button>
                    </TooltipTrigger><TooltipContent side="top">Header bold</TooltipContent></Tooltip>
                  </div>
                </div>

                {/* Column Widths */}
                <div className={styles.propGroup}>
                  <span className={styles.propSmallLabel}>Column Widths</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {tableData.rows[0]?.map((_, colIndex) => (
                      <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <span style={{ fontSize: '0.5625rem', color: 'hsl(var(--muted-foreground))' }}>Col {colIndex + 1}</span>
                        <Select value={tableData.columnWidths?.[colIndex] || 'auto'} onValueChange={(v) => updateColumnWidth(colIndex, v)}>
                          <SelectTrigger className="h-6 text-xs w-16"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border shadow-lg z-50">
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="50px">50px</SelectItem>
                            <SelectItem value="100px">100px</SelectItem>
                            <SelectItem value="150px">150px</SelectItem>
                            <SelectItem value="200px">200px</SelectItem>
                            <SelectItem value="20%">20%</SelectItem>
                            <SelectItem value="25%">25%</SelectItem>
                            <SelectItem value="33%">33%</SelectItem>
                            <SelectItem value="50%">50%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          )}

          {/* Mode chip - hidden, tables default to dynamic */}
        </div>



        {/* ── Table ── */}
        <div className={styles.tableWrapper}>
          <table className={`${styles.table} ${tableData.showBorder ? styles.bordered : ''}`}
            style={{ borderColor: tableData.borderColor || '#ddd' }}>
            <tbody>
              {tableData.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => {
                    if (isCellMerged(rowIndex, colIndex)) return null;
                    const merge = getCellMerge(rowIndex, colIndex);
                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                    const cellStyle = getCellStyle(rowIndex, colIndex);
                    // For header row (row 0), apply headerStyle as base, then overlay individual cell styles
                    const isHeader = rowIndex === 0;
                    const hs = tableData.headerStyle;
                    const inputStyle: React.CSSProperties = {
                      color: cellStyle.color || (isHeader ? (hs?.textColor || '#000000') : undefined),
                      fontWeight: cellStyle.bold ? 'bold' : (isHeader && hs?.bold !== false ? 'bold' : undefined),
                      fontStyle: cellStyle.italic ? 'italic' : undefined,
                      textDecoration: cellStyle.underline ? 'underline' : undefined,
                      backgroundColor: cellStyle.backgroundColor || (isHeader ? (hs?.backgroundColor || '#FFC000') : undefined),
                      fontSize: cellStyle.fontSize,
                      textAlign: cellStyle.textAlign, verticalAlign: cellStyle.verticalAlign,
                    };
                    const tdStyle: React.CSSProperties = {
                      borderColor: tableData.borderColor || '#ddd',
                      backgroundColor: cellStyle.backgroundColor || (isHeader ? (hs?.backgroundColor || '#FFC000') : undefined),
                    };

                    return (
                      <td key={colIndex} rowSpan={merge?.rowSpan} colSpan={merge?.colSpan}
                        className={`${styles.cell} ${tableData.showBorder ? styles.bordered : ''} ${isSelected ? styles.selected : ''}`}
                        style={tdStyle}
                        onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}>
                        <Input value={cell} onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          className={styles.cellInput} style={inputStyle}
                          placeholder={isHeader ? `Header ${colIndex + 1}` : ''} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Dynamic Mode Panel ── */}
        {isDynamic && (
          <div className={styles.dynamicPanel}>
            <div className={styles.dynamicHeader}>
              <div className={styles.dynamicTitle}>
                <Zap size={12} />
                Dynamic Data (th:each)
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-6 px-2 text-xs">
                  <Upload size={12} className="mr-1" />
                  Upload CSV/Excel
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={importFileData}
                  style={{ display: 'none' }}
                />
                <Button size="sm" variant="ghost" onClick={() => setShowJsonImport(!showJsonImport)} className="h-6 px-2 text-xs">
                  <FileJson size={12} className="mr-1" />
                  {showJsonImport ? 'Hide' : 'Import JSON'}
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>Variable:</span>
              <span className={styles.variableTag}>
                {tableData.tableVariableName || generateTableVariableName(section.id)}
              </span>
            </div>

            {showJsonImport && (
              <div className={styles.jsonImportArea}>
                <Textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={'[\n  { "name": "John", "email": "john@example.com" }\n]'}
                  className={styles.jsonTextarea} rows={4} />
                <Button size="sm" onClick={importJsonData} className="h-7">
                  <Database size={12} className="mr-1" /> Import
                </Button>
              </div>
            )}

            {/* Column Mappings */}
            {tableData.jsonMapping?.columnMappings && tableData.jsonMapping.columnMappings.length > 0 && (
              <div className={styles.mappingsGrid}>
                <span className={styles.propSmallLabel}>Column Mappings</span>
                {tableData.jsonMapping.columnMappings.map((mapping, index) => (
                  <div key={index} className={styles.mappingRow}>
                    <Input value={mapping.jsonPath} onChange={(e) => updateColumnMapping(index, 'jsonPath', e.target.value)}
                      placeholder="jsonPath" className="h-6 text-xs flex-1" />
                    <span className={styles.mappingArrow}>→</span>
                    <Input value={mapping.header} onChange={(e) => updateColumnMapping(index, 'header', e.target.value)}
                      placeholder="Header" className="h-6 text-xs flex-1" />
                    <button className={styles.toolbarBtn} onClick={() => removeColumnMapping(index)} style={{ width: '1.25rem', height: '1.25rem' }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" onClick={addColumnMapping} className="h-6 text-xs self-start">
                  <Plus size={10} className="mr-1" /> Add mapping
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Status Bar ── */}
        <div className={styles.statusBar}>
          <span>{tableData.rows.length} rows × {tableData.rows[0]?.length || 0} cols</span>
          {selectedCell && (
            <span>
              Selected: R{selectedCell.row + 1}:C{selectedCell.col + 1}
              {getCellMerge(selectedCell.row, selectedCell.col) ? ' (merged)' : ''}
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
