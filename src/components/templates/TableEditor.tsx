import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Merge } from "lucide-react";
import { Section } from "@/types/section";
import styles from "./TableEditor.module.scss";

interface TableEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
}

interface TableData {
  rows: string[][];
  showBorder: boolean;
  mergedCells: Record<string, { rowSpan: number; colSpan: number }>;
}

export const TableEditor = ({ section, onUpdate }: TableEditorProps) => {
  const parseTableData = (): TableData => {
    try {
      const data = section.variables?.tableData as any;
      if (data && typeof data === 'object') {
        return {
          rows: data.rows || [['Header 1', 'Header 2'], ['Data 1', 'Data 2']],
          showBorder: data.showBorder !== false,
          mergedCells: data.mergedCells || {}
        };
      }
    } catch (e) {
      console.error('Error parsing table data:', e);
    }
    return {
      rows: [['Header 1', 'Header 2'], ['Data 1', 'Data 2']],
      showBorder: true,
      mergedCells: {}
    };
  };

  const [tableData, setTableData] = useState<TableData>(parseTableData());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

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
    updateTableData({
      ...tableData,
      rows: newRows
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
    updateTableData({
      ...tableData,
      rows: newRows
    });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...tableData.rows];
    newRows[rowIndex][colIndex] = value;
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Table Editor</h3>
        <div className={styles.toggleGroup}>
          <Label className={styles.toggleLabel}>Show Border</Label>
          <Switch checked={tableData.showBorder} onCheckedChange={toggleBorder} />
        </div>
      </div>

      <div className={styles.actions}>
        <Button size="sm" variant="outline" onClick={addRow} className={styles.actionButton}>
          <Plus className={`${styles.icon} ${styles.iconMargin}`} />
          Add Row
        </Button>
        <Button size="sm" variant="outline" onClick={addColumn} className={styles.actionButton}>
          <Plus className={`${styles.icon} ${styles.iconMargin}`} />
          Add Column
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={mergeCells}
          disabled={!selectedCell}
          className={styles.actionButton}
        >
          <Merge className={`${styles.icon} ${styles.iconMargin}`} />
          Toggle Merge
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={`${styles.table} ${tableData.showBorder ? styles.bordered : ''}`}>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  if (isCellMerged(rowIndex, colIndex)) {
                    return null;
                  }

                  const merge = getCellMerge(rowIndex, colIndex);
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;

                  return (
                    <td
                      key={colIndex}
                      rowSpan={merge?.rowSpan}
                      colSpan={merge?.colSpan}
                      className={`${styles.cell} ${tableData.showBorder ? styles.bordered : ''} ${isSelected ? styles.selected : ''}`}
                      onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                    >
                      <Input
                        value={cell}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        className={styles.cellInput}
                        placeholder={rowIndex === 0 ? `Header ${colIndex + 1}` : `Cell ${rowIndex},${colIndex + 1}`}
                      />
                    </td>
                  );
                })}
                <td className={styles.deleteCell}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(rowIndex)}
                    disabled={tableData.rows.length <= 1}
                    className={styles.deleteButton}
                  >
                    <Trash2 className={styles.icon} />
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              {tableData.rows[0]?.map((_, colIndex) => (
                <td key={colIndex} className={styles.deleteCell}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeColumn(colIndex)}
                    disabled={tableData.rows[0]?.length <= 1}
                    className={styles.deleteButton}
                  >
                    <Trash2 className={styles.icon} />
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