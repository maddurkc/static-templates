import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Section, LayoutTableData, LayoutTableRow, LayoutTableCell } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, GripVertical } from "lucide-react";
import { thymeleafToPlaceholder } from "@/lib/thymeleafUtils";
import styles from "./LayoutTableEditor.module.scss";

interface LayoutTableEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
  onDeleteNestedSection?: (cellId: string, sectionId: string) => void;
}

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default layout table data
const getDefaultLayoutTableData = (): LayoutTableData => ({
  rows: [
    {
      id: generateId(),
      cells: [
        { id: generateId(), sections: [], width: '50%' },
        { id: generateId(), sections: [], width: '50%' },
      ],
    },
  ],
  cellPadding: '8px',
  showBorders: true,
  borderColor: '#dee2e6',
});

// Droppable cell component
const DroppableCell = ({
  cell,
  rowIndex,
  cellIndex,
  onDeleteSection,
  onWidthChange,
  showBorders,
}: {
  cell: LayoutTableCell;
  rowIndex: number;
  cellIndex: number;
  onDeleteSection: (sectionId: string) => void;
  onWidthChange: (width: string) => void;
  showBorders: boolean;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `layout-cell-${cell.id}`,
    data: { cellId: cell.id, rowIndex, cellIndex },
  });

  return (
    <td
      ref={setNodeRef}
      className={`${styles.layoutCell} ${isOver ? styles.dropOver : ''} ${showBorders ? styles.bordered : ''}`}
      style={{ width: cell.width || 'auto' }}
    >
      <div className={styles.cellHeader}>
        <span className={styles.cellLabel}>
          Cell {rowIndex + 1}-{cellIndex + 1}
        </span>
        <Input
          value={cell.width || ''}
          onChange={(e) => onWidthChange(e.target.value)}
          placeholder="auto"
          className={styles.widthInput}
          title="Column width (e.g., 50%, 200px)"
        />
      </div>

      <div className={styles.cellContent}>
        {cell.sections.length === 0 ? (
          <div className={styles.emptyCell}>
            <span>Drop sections here</span>
            <span className={styles.dropHint}>Drag from library</span>
          </div>
        ) : (
          cell.sections.map((nestedSection) => (
            <div key={nestedSection.id} className={styles.nestedSection}>
              <div className={styles.nestedSectionHeader}>
                <Badge variant="secondary" className="text-xs">
                  {nestedSection.type}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDeleteSection(nestedSection.id)}
                  className={styles.deleteButton}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div
                className={styles.nestedSectionContent}
                dangerouslySetInnerHTML={{
                  __html: thymeleafToPlaceholder(nestedSection.content).replace(
                    /\{\{(\w+)\}\}/g,
                    '<span style="background: hsl(var(--primary) / 0.1); padding: 0 4px; border-radius: 2px; font-size: 0.7rem;">${$1}</span>'
                  ),
                }}
                style={nestedSection.styles as React.CSSProperties}
              />
            </div>
          ))
        )}
      </div>
    </td>
  );
};

export const LayoutTableEditor = ({
  section,
  onUpdate,
  onDeleteNestedSection,
}: LayoutTableEditorProps) => {
  const layoutData: LayoutTableData = section.layoutTableData || getDefaultLayoutTableData();

  const updateLayoutData = (newData: LayoutTableData) => {
    onUpdate({
      ...section,
      layoutTableData: newData,
    });
  };

  const addRow = () => {
    const columnCount = layoutData.rows[0]?.cells.length || 2;
    const newRow: LayoutTableRow = {
      id: generateId(),
      cells: Array.from({ length: columnCount }, () => ({
        id: generateId(),
        sections: [],
        width: `${100 / columnCount}%`,
      })),
    };
    updateLayoutData({
      ...layoutData,
      rows: [...layoutData.rows, newRow],
    });
  };

  const removeRow = (rowIndex: number) => {
    if (layoutData.rows.length <= 1) return;
    updateLayoutData({
      ...layoutData,
      rows: layoutData.rows.filter((_, i) => i !== rowIndex),
    });
  };

  const addColumn = () => {
    const newColumnCount = (layoutData.rows[0]?.cells.length || 0) + 1;
    const newWidth = `${Math.floor(100 / newColumnCount)}%`;
    
    updateLayoutData({
      ...layoutData,
      rows: layoutData.rows.map((row) => ({
        ...row,
        cells: [
          ...row.cells.map(c => ({ ...c, width: newWidth })),
          { id: generateId(), sections: [], width: newWidth },
        ],
      })),
    });
  };

  const removeColumn = (colIndex: number) => {
    if ((layoutData.rows[0]?.cells.length || 0) <= 1) return;
    updateLayoutData({
      ...layoutData,
      rows: layoutData.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, i) => i !== colIndex),
      })),
    });
  };

  const updateCellWidth = (rowIndex: number, cellIndex: number, width: string) => {
    const newRows = [...layoutData.rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      cells: newRows[rowIndex].cells.map((cell, i) =>
        i === cellIndex ? { ...cell, width } : cell
      ),
    };
    updateLayoutData({ ...layoutData, rows: newRows });
  };

  const handleDeleteNestedSection = (cellId: string, sectionId: string) => {
    if (onDeleteNestedSection) {
      onDeleteNestedSection(cellId, sectionId);
    } else {
      // Fallback: update locally
      const newRows = layoutData.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) =>
          cell.id === cellId
            ? { ...cell, sections: cell.sections.filter((s) => s.id !== sectionId) }
            : cell
        ),
      }));
      updateLayoutData({ ...layoutData, rows: newRows });
    }
  };

  const toggleBorders = (checked: boolean) => {
    updateLayoutData({ ...layoutData, showBorders: checked });
  };

  const updateBorderColor = (color: string) => {
    updateLayoutData({ ...layoutData, borderColor: color });
  };

  const updateCellPadding = (padding: string) => {
    updateLayoutData({ ...layoutData, cellPadding: padding });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Layout Table</span>
        <div className={styles.actions}>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3 w-3 mr-1" />
            Row
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => removeRow(layoutData.rows.length - 1)}
            disabled={layoutData.rows.length <= 1}
          >
            <Minus className="h-3 w-3 mr-1" />
            Row
          </Button>
          <Button size="sm" variant="outline" onClick={addColumn}>
            <Plus className="h-3 w-3 mr-1" />
            Column
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => removeColumn((layoutData.rows[0]?.cells.length || 1) - 1)}
            disabled={(layoutData.rows[0]?.cells.length || 0) <= 1}
          >
            <Minus className="h-3 w-3 mr-1" />
            Column
          </Button>
        </div>
      </div>

      <div className={styles.settingsRow}>
        <div className={styles.settingItem}>
          <Label className={styles.settingLabel}>Borders</Label>
          <Switch
            checked={layoutData.showBorders ?? true}
            onCheckedChange={toggleBorders}
          />
        </div>

        {layoutData.showBorders && (
          <div className={styles.settingItem}>
            <Label className={styles.settingLabel}>Border Color</Label>
            <input
              type="color"
              value={layoutData.borderColor || '#dee2e6'}
              onChange={(e) => updateBorderColor(e.target.value)}
              className={styles.colorInput}
            />
          </div>
        )}

        <div className={styles.settingItem}>
          <Label className={styles.settingLabel}>Cell Padding</Label>
          <Input
            value={layoutData.cellPadding || '8px'}
            onChange={(e) => updateCellPadding(e.target.value)}
            className={styles.widthInput}
            placeholder="8px"
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={`${styles.layoutTable} ${layoutData.showBorders ? styles.bordered : ''}`}>
          <tbody>
            {layoutData.rows.map((row, rowIndex) => (
              <tr key={row.id} className={styles.layoutRow}>
                {row.cells.map((cell, cellIndex) => (
                  <DroppableCell
                    key={cell.id}
                    cell={cell}
                    rowIndex={rowIndex}
                    cellIndex={cellIndex}
                    showBorders={layoutData.showBorders ?? true}
                    onDeleteSection={(sectionId) =>
                      handleDeleteNestedSection(cell.id, sectionId)
                    }
                    onWidthChange={(width) =>
                      updateCellWidth(rowIndex, cellIndex, width)
                    }
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper function to get default layout table data - exported for use in TemplateEditor
export { getDefaultLayoutTableData };
