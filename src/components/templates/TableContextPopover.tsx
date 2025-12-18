import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Columns,
  Rows,
  Table as TableIcon,
  Grid3X3,
  ArrowUpToLine, 
  ArrowDownToLine, 
  ArrowLeftToLine, 
  ArrowRightToLine, 
  Trash2,
  MousePointer2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette
} from "lucide-react";
import styles from "./TableContextPopover.module.scss";

export interface TableContextPopoverProps {
  selectedRow: number | null;
  selectedCol: number | null;
  totalRows: number;
  totalCols: number;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onInsertColumnLeft: () => void;
  onInsertColumnRight: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onSelectRow?: () => void;
  onSelectColumn?: () => void;
  // Table properties
  showBorder?: boolean;
  borderColor?: string;
  borderWidth?: number;
  tableBackgroundColor?: string;
  onTableBorderChange?: (show: boolean) => void;
  onTableBorderColorChange?: (color: string) => void;
  onTableBorderWidthChange?: (width: number) => void;
  onTableBackgroundColorChange?: (color: string) => void;
  // Cell properties
  cellBorderColor?: string;
  cellBorderWidth?: number;
  cellBackgroundColor?: string;
  cellAlignment?: 'left' | 'center' | 'right' | 'justify';
  onCellBorderColorChange?: (color: string) => void;
  onCellBorderWidthChange?: (width: number) => void;
  onCellBackgroundColorChange?: (color: string) => void;
  onCellAlignmentChange?: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#f5f5f5', '#e0e0e0', 
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'
];

export const TableContextPopover = ({
  selectedRow,
  selectedCol,
  totalRows,
  totalCols,
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColumnLeft,
  onInsertColumnRight,
  onDeleteRow,
  onDeleteColumn,
  onSelectRow,
  onSelectColumn,
  showBorder = true,
  borderColor = '#ddd',
  borderWidth = 1,
  tableBackgroundColor = '#ffffff',
  onTableBorderChange,
  onTableBorderColorChange,
  onTableBorderWidthChange,
  onTableBackgroundColorChange,
  cellBorderColor = '#ddd',
  cellBorderWidth = 1,
  cellBackgroundColor = '#ffffff',
  cellAlignment = 'left',
  onCellBorderColorChange,
  onCellBorderWidthChange,
  onCellBackgroundColorChange,
  onCellAlignmentChange,
  disabled = false,
  open,
  onOpenChange,
  children
}: TableContextPopoverProps) => {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [rowsOpen, setRowsOpen] = useState(false);
  const [tablePropsOpen, setTablePropsOpen] = useState(false);
  const [cellPropsOpen, setCellPropsOpen] = useState(false);

  const hasSelection = selectedRow !== null && selectedCol !== null;
  const canDeleteRow = totalRows > 1;
  const canDeleteCol = totalCols > 1;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className={styles.popoverContent}
        align="start"
        side="top"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <TooltipProvider delayDuration={300}>
          <div className={styles.toolbar}>
            {/* Columns */}
            <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.iconButton}
                      disabled={disabled}
                    >
                      <Columns className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Columns</TooltipContent>
              </Tooltip>
              <PopoverContent className={styles.subPopover} align="start" side="bottom" sideOffset={4}>
                <div className={styles.menuList}>
                  <button
                    className={styles.menuItem}
                    onClick={() => { onInsertColumnLeft(); setColumnsOpen(false); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowLeftToLine className="h-4 w-4" />
                    <span>Insert column left</span>
                  </button>
                  <button
                    className={styles.menuItem}
                    onClick={() => { onInsertColumnRight(); setColumnsOpen(false); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowRightToLine className="h-4 w-4" />
                    <span>Insert column right</span>
                  </button>
                  <button
                    className={`${styles.menuItem} ${styles.deleteItem}`}
                    onClick={() => { onDeleteColumn(); setColumnsOpen(false); }}
                    disabled={disabled || !hasSelection || !canDeleteCol}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete column</span>
                  </button>
                  {onSelectColumn && (
                    <button
                      className={styles.menuItem}
                      onClick={() => { onSelectColumn(); setColumnsOpen(false); }}
                      disabled={disabled || !hasSelection}
                    >
                      <MousePointer2 className="h-4 w-4" />
                      <span>Select column</span>
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Rows */}
            <Popover open={rowsOpen} onOpenChange={setRowsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.iconButton}
                      disabled={disabled}
                    >
                      <Rows className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Rows</TooltipContent>
              </Tooltip>
              <PopoverContent className={styles.subPopover} align="start" side="bottom" sideOffset={4}>
                <div className={styles.menuList}>
                  <button
                    className={styles.menuItem}
                    onClick={() => { onInsertRowAbove(); setRowsOpen(false); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowUpToLine className="h-4 w-4" />
                    <span>Insert row above</span>
                  </button>
                  <button
                    className={styles.menuItem}
                    onClick={() => { onInsertRowBelow(); setRowsOpen(false); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    <span>Insert row below</span>
                  </button>
                  <button
                    className={`${styles.menuItem} ${styles.deleteItem}`}
                    onClick={() => { onDeleteRow(); setRowsOpen(false); }}
                    disabled={disabled || !hasSelection || !canDeleteRow}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete row</span>
                  </button>
                  {onSelectRow && (
                    <button
                      className={styles.menuItem}
                      onClick={() => { onSelectRow(); setRowsOpen(false); }}
                      disabled={disabled || !hasSelection}
                    >
                      <MousePointer2 className="h-4 w-4" />
                      <span>Select row</span>
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className={styles.separator} />

            {/* Table Properties */}
            <Popover open={tablePropsOpen} onOpenChange={setTablePropsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.iconButton}
                      disabled={disabled}
                    >
                      <TableIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Table properties</TooltipContent>
              </Tooltip>
              <PopoverContent className={styles.propsPopover} align="start" side="bottom" sideOffset={4}>
                <div className={styles.propsSection}>
                  <div className={styles.propsRow}>
                    <Label className={styles.propsLabel}>Show border</Label>
                    <Switch
                      checked={showBorder}
                      onCheckedChange={(checked) => onTableBorderChange?.(checked)}
                    />
                  </div>
                  
                  {showBorder && (
                    <>
                      <div className={styles.propsRow}>
                        <Label className={styles.propsLabel}>Border color</Label>
                        <div className={styles.colorPicker}>
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`${styles.colorSwatch} ${borderColor === color ? styles.selected : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => onTableBorderColorChange?.(color)}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className={styles.propsRow}>
                        <Label className={styles.propsLabel}>Border width</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={borderWidth}
                          onChange={(e) => onTableBorderWidthChange?.(parseInt(e.target.value) || 1)}
                          className={styles.numberInput}
                        />
                      </div>
                    </>
                  )}
                  
                  <div className={styles.propsRow}>
                    <Label className={styles.propsLabel}>Background</Label>
                    <div className={styles.colorPicker}>
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`${styles.colorSwatch} ${tableBackgroundColor === color ? styles.selected : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => onTableBackgroundColorChange?.(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Cell Properties */}
            <Popover open={cellPropsOpen} onOpenChange={setCellPropsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.iconButton}
                      disabled={disabled || !hasSelection}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Cell properties</TooltipContent>
              </Tooltip>
              <PopoverContent className={styles.propsPopover} align="start" side="bottom" sideOffset={4}>
                <div className={styles.propsSection}>
                  <div className={styles.propsRow}>
                    <Label className={styles.propsLabel}>Border color</Label>
                    <div className={styles.colorPicker}>
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`${styles.colorSwatch} ${cellBorderColor === color ? styles.selected : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => onCellBorderColorChange?.(color)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.propsRow}>
                    <Label className={styles.propsLabel}>Border width</Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={cellBorderWidth}
                      onChange={(e) => onCellBorderWidthChange?.(parseInt(e.target.value) || 0)}
                      className={styles.numberInput}
                    />
                  </div>
                  
                  <div className={styles.propsRow}>
                    <Label className={styles.propsLabel}>Background</Label>
                    <div className={styles.colorPicker}>
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`${styles.colorSwatch} ${cellBackgroundColor === color ? styles.selected : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => onCellBackgroundColorChange?.(color)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.propsRow}>
                    <Label className={styles.propsLabel}>Text alignment</Label>
                    <div className={styles.alignmentGroup}>
                      <Button
                        variant={cellAlignment === 'left' ? 'default' : 'ghost'}
                        size="icon"
                        className={styles.alignButton}
                        onClick={() => onCellAlignmentChange?.('left')}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={cellAlignment === 'center' ? 'default' : 'ghost'}
                        size="icon"
                        className={styles.alignButton}
                        onClick={() => onCellAlignmentChange?.('center')}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={cellAlignment === 'right' ? 'default' : 'ghost'}
                        size="icon"
                        className={styles.alignButton}
                        onClick={() => onCellAlignmentChange?.('right')}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={cellAlignment === 'justify' ? 'default' : 'ghost'}
                        size="icon"
                        className={styles.alignButton}
                        onClick={() => onCellAlignmentChange?.('justify')}
                      >
                        <AlignJustify className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
};
