import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Merge, Palette, Bold, Italic, Underline } from "lucide-react";
import { Section } from "@/types/section";
import { TableData, CellStyle, HeaderStyle } from "@/lib/tableUtils";
import styles from "./TableEditor.module.scss";

interface TableEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
}

export const TableEditor = ({ section, onUpdate }: TableEditorProps) => {
  const parseTableData = (): TableData => {
    try {
      const data = section.variables?.tableData as any;
      if (data && typeof data === 'object') {
        return {
          rows: data.rows || [['Header 1', 'Header 2'], ['Data 1', 'Data 2']],
          showBorder: data.showBorder !== false,
          borderColor: data.borderColor || '#ddd',
          mergedCells: data.mergedCells || {},
          cellStyles: data.cellStyles || {},
          headerStyle: data.headerStyle || { backgroundColor: '#f5f5f5', textColor: '#000000', bold: true }
        };
      }
    } catch (e) {
      console.error('Error parsing table data:', e);
    }
    return {
      rows: [['Header 1', 'Header 2'], ['Data 1', 'Data 2']],
      showBorder: true,
      borderColor: '#ddd',
      mergedCells: {},
      cellStyles: {},
      headerStyle: { backgroundColor: '#f5f5f5', textColor: '#000000', bold: true }
    };
  };

  const [tableData, setTableData] = useState<TableData>(parseTableData());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Re-parse table data when section changes
  useEffect(() => {
    setTableData(parseTableData());
  }, [section.id, section.variables?.tableData]);

  const updateTableData = (newData: TableData) => {
    setTableData(newData);
    onUpdate({
      ...section,
      variables: {
        ...section.variables,
        tableData: newData
      }
    });
  };

  const addRow = () => {
    const newRow = new Array(tableData.rows[0]?.length || 2).fill('');
    updateTableData({
      ...tableData,
      rows: [...tableData.rows, newRow]
    });
  };

  const removeRow = (index: number) => {
    if (tableData.rows.length <= 1) return;
    const newRows = tableData.rows.filter((_, i) => i !== index);
    // Clean up cell styles for removed row
    const newCellStyles = { ...tableData.cellStyles };
    Object.keys(newCellStyles).forEach(key => {
      const [r] = key.split('-').map(Number);
      if (r === index) {
        delete newCellStyles[key];
      } else if (r > index) {
        // Shift styles for rows after the removed one
        const [, c] = key.split('-').map(Number);
        delete newCellStyles[key];
        newCellStyles[`${r - 1}-${c}`] = tableData.cellStyles![key];
      }
    });
    updateTableData({
      ...tableData,
      rows: newRows,
      cellStyles: newCellStyles
    });
  };

  const addColumn = () => {
    const newRows = tableData.rows.map(row => [...row, '']);
    updateTableData({
      ...tableData,
      rows: newRows
    });
  };

  const removeColumn = (colIndex: number) => {
    if (tableData.rows[0]?.length <= 1) return;
    const newRows = tableData.rows.map(row => row.filter((_, i) => i !== colIndex));
    // Clean up cell styles for removed column
    const newCellStyles = { ...tableData.cellStyles };
    Object.keys(newCellStyles).forEach(key => {
      const [r, c] = key.split('-').map(Number);
      if (c === colIndex) {
        delete newCellStyles[key];
      } else if (c > colIndex) {
        // Shift styles for columns after the removed one
        delete newCellStyles[key];
        newCellStyles[`${r}-${c - 1}`] = tableData.cellStyles![key];
      }
    });
    updateTableData({
      ...tableData,
      rows: newRows,
      cellStyles: newCellStyles
    });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = tableData.rows.map((row, rIdx) => 
      rIdx === rowIndex 
        ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell)
        : [...row]
    );
    updateTableData({
      ...tableData,
      rows: newRows
    });
  };

  const toggleBorder = () => {
    updateTableData({
      ...tableData,
      showBorder: !tableData.showBorder
    });
  };

  const updateBorderColor = (color: string) => {
    updateTableData({
      ...tableData,
      borderColor: color
    });
  };

  const updateHeaderStyle = (updates: Partial<HeaderStyle>) => {
    updateTableData({
      ...tableData,
      headerStyle: {
        ...tableData.headerStyle,
        ...updates
      }
    });
  };

  const mergeCells = () => {
    if (!selectedCell) return;
    
    const cellKey = `${selectedCell.row}-${selectedCell.col}`;
    const currentMerge = tableData.mergedCells[cellKey];
    
    if (currentMerge) {
      // Unmerge
      const newMergedCells = { ...tableData.mergedCells };
      delete newMergedCells[cellKey];
      updateTableData({
        ...tableData,
        mergedCells: newMergedCells
      });
    } else {
      // Simple merge: 2 columns
      updateTableData({
        ...tableData,
        mergedCells: {
          ...tableData.mergedCells,
          [cellKey]: { rowSpan: 1, colSpan: 2 }
        }
      });
    }
  };

  const isCellMerged = (rowIndex: number, colIndex: number) => {
    // Check if this cell is part of a merged cell
    for (const [key, merge] of Object.entries(tableData.mergedCells)) {
      const [mergeRow, mergeCol] = key.split('-').map(Number);
      if (
        rowIndex >= mergeRow && 
        rowIndex < mergeRow + merge.rowSpan &&
        colIndex >= mergeCol && 
        colIndex < mergeCol + merge.colSpan &&
        (rowIndex !== mergeRow || colIndex !== mergeCol)
      ) {
        return true;
      }
    }
    return false;
  };

  const getCellMerge = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    return tableData.mergedCells[cellKey];
  };

  const getCellStyle = (rowIndex: number, colIndex: number): CellStyle => {
    const cellKey = `${rowIndex}-${colIndex}`;
    return tableData.cellStyles?.[cellKey] || {};
  };

  const updateCellStyle = (rowIndex: number, colIndex: number, style: Partial<CellStyle>) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const currentStyle = getCellStyle(rowIndex, colIndex);
    updateTableData({
      ...tableData,
      cellStyles: {
        ...tableData.cellStyles,
        [cellKey]: { ...currentStyle, ...style }
      }
    });
  };

  const toggleCellStyle = (rowIndex: number, colIndex: number, property: keyof CellStyle) => {
    const currentStyle = getCellStyle(rowIndex, colIndex);
    updateCellStyle(rowIndex, colIndex, { [property]: !currentStyle[property] });
  };

  const selectedCellStyle = selectedCell ? getCellStyle(selectedCell.row, selectedCell.col) : {};

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Table Editor</h3>
        <div className={styles.toggleGroup}>
          <Label className={styles.toggleLabel}>Show Border</Label>
          <Switch checked={tableData.showBorder} onCheckedChange={toggleBorder} />
        </div>
      </div>

      {/* Border Color */}
      {tableData.showBorder && (
        <div className={styles.borderColorRow}>
          <Label className={styles.toggleLabel}>Border Color</Label>
          <div className={styles.colorPickerWrapper}>
            <input
              type="color"
              value={tableData.borderColor || '#ddd'}
              onChange={(e) => updateBorderColor(e.target.value)}
              className={styles.colorInput}
            />
            <Input
              value={tableData.borderColor || '#ddd'}
              onChange={(e) => updateBorderColor(e.target.value)}
              className={styles.colorTextInput}
              placeholder="#ddd"
            />
          </div>
        </div>
      )}

      {/* Header Row Styling */}
      <div className={styles.headerStyleSection}>
        <Label className={styles.toggleLabel}>Header Row Styling</Label>
        <div className={styles.headerStyleControls}>
          <div className={styles.colorPickerWrapper}>
            <Label className={styles.smallLabel}>Background</Label>
            <input
              type="color"
              value={tableData.headerStyle?.backgroundColor || '#f5f5f5'}
              onChange={(e) => updateHeaderStyle({ backgroundColor: e.target.value })}
              className={styles.colorInput}
            />
          </div>
          <div className={styles.colorPickerWrapper}>
            <Label className={styles.smallLabel}>Text Color</Label>
            <input
              type="color"
              value={tableData.headerStyle?.textColor || '#000000'}
              onChange={(e) => updateHeaderStyle({ textColor: e.target.value })}
              className={styles.colorInput}
            />
          </div>
          <div className={styles.toggleGroup}>
            <Label className={styles.smallLabel}>Bold</Label>
            <Switch 
              checked={tableData.headerStyle?.bold !== false} 
              onCheckedChange={(checked) => updateHeaderStyle({ bold: checked })} 
            />
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button size="sm" variant="outline" onClick={addRow} className="h-8 px-2">
          <Plus className="h-3 w-3 mr-1" />
          Add Row
        </Button>
        <Button size="sm" variant="outline" onClick={addColumn} className="h-8 px-2">
          <Plus className="h-3 w-3 mr-1" />
          Add Column
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={mergeCells}
          disabled={!selectedCell}
          className="h-8 px-2"
        >
          <Merge className="h-3 w-3 mr-1" />
          Toggle Merge
        </Button>
      </div>

      {/* Cell Styling Controls */}
      {selectedCell && (
        <div className={styles.cellStyleControls}>
          <span className={styles.cellStyleLabel}>
            Cell {selectedCell.row + 1},{selectedCell.col + 1} Styles:
          </span>
          <div className={styles.styleButtons}>
            <Button
              size="icon"
              variant={selectedCellStyle.bold ? "default" : "outline"}
              onClick={() => toggleCellStyle(selectedCell.row, selectedCell.col, 'bold')}
              className="h-7 w-7"
              title="Bold"
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant={selectedCellStyle.italic ? "default" : "outline"}
              onClick={() => toggleCellStyle(selectedCell.row, selectedCell.col, 'italic')}
              className="h-7 w-7"
              title="Italic"
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant={selectedCellStyle.underline ? "default" : "outline"}
              onClick={() => toggleCellStyle(selectedCell.row, selectedCell.col, 'underline')}
              className="h-7 w-7"
              title="Underline"
            >
              <Underline className="h-3 w-3" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="outline" className="h-7 w-7" title="Text Color">
                  <Palette className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-popover border shadow-lg z-50" align="start">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={selectedCellStyle.color || '#000000'}
                        onChange={(e) => updateCellStyle(selectedCell.row, selectedCell.col, { color: e.target.value })}
                        className={styles.colorInput}
                      />
                      <Input
                        value={selectedCellStyle.color || ''}
                        onChange={(e) => updateCellStyle(selectedCell.row, selectedCell.col, { color: e.target.value })}
                        placeholder="#000000"
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Background Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={selectedCellStyle.backgroundColor || '#ffffff'}
                        onChange={(e) => updateCellStyle(selectedCell.row, selectedCell.col, { backgroundColor: e.target.value })}
                        className={styles.colorInput}
                      />
                      <Input
                        value={selectedCellStyle.backgroundColor || ''}
                        onChange={(e) => updateCellStyle(selectedCell.row, selectedCell.col, { backgroundColor: e.target.value })}
                        placeholder="#ffffff"
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Font Size</Label>
                    <Select
                      value={selectedCellStyle.fontSize || 'default'}
                      onValueChange={(value) => updateCellStyle(selectedCell.row, selectedCell.col, { fontSize: value === 'default' ? undefined : value })}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="10px">10px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="14px">14px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="18px">18px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={`${styles.table} ${tableData.showBorder ? styles.bordered : ''}`}
               style={{ borderColor: tableData.borderColor || '#ddd' }}>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  if (isCellMerged(rowIndex, colIndex)) {
                    return null;
                  }

                  const merge = getCellMerge(rowIndex, colIndex);
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                  const cellStyle = getCellStyle(rowIndex, colIndex);
                  
                  const inputStyle: React.CSSProperties = {
                    color: cellStyle.color,
                    fontWeight: cellStyle.bold ? 'bold' : undefined,
                    fontStyle: cellStyle.italic ? 'italic' : undefined,
                    textDecoration: cellStyle.underline ? 'underline' : undefined,
                    backgroundColor: cellStyle.backgroundColor,
                    fontSize: cellStyle.fontSize,
                  };

                  return (
                    <td
                      key={colIndex}
                      rowSpan={merge?.rowSpan}
                      colSpan={merge?.colSpan}
                      className={`${styles.cell} ${tableData.showBorder ? styles.bordered : ''} ${isSelected ? styles.selected : ''}`}
                      style={{ borderColor: tableData.borderColor || '#ddd' }}
                      onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                    >
                      <Input
                        value={cell}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        className={styles.cellInput}
                        style={inputStyle}
                        placeholder={rowIndex === 0 ? `Header ${colIndex + 1}` : `Cell ${rowIndex},${colIndex + 1}`}
                      />
                    </td>
                  );
                })}
                <td className="p-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(rowIndex)}
                    disabled={tableData.rows.length <= 1}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              {tableData.rows[0]?.map((_, colIndex) => (
                <td key={colIndex} className="p-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeColumn(colIndex)}
                    disabled={tableData.rows[0]?.length <= 1}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {selectedCell && (
        <p className={styles.selectedInfo}>
          Selected: Row {selectedCell.row + 1}, Column {selectedCell.col + 1}
          {getCellMerge(selectedCell.row, selectedCell.col) && ' (Merged)'}
        </p>
      )}
    </div>
  );
};
