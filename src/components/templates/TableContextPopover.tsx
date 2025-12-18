import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowUpToLine, 
  ArrowDownToLine, 
  ArrowLeftToLine, 
  ArrowRightToLine, 
  Trash2,
  TableCellsMerge,
  Table as TableIcon
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
  onMergeCells?: () => void;
  onDeleteTable?: () => void;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

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
  onMergeCells,
  onDeleteTable,
  disabled = false,
  open,
  onOpenChange,
  children
}: TableContextPopoverProps) => {
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
            {/* Row operations */}
            <div className={styles.group}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.iconButton}
                    onClick={() => { onInsertRowAbove(); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowUpToLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Insert row above</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.iconButton}
                    onClick={() => { onInsertRowBelow(); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Insert row below</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`${styles.iconButton} ${styles.deleteButton}`}
                    onClick={() => { onDeleteRow(); }}
                    disabled={disabled || !hasSelection || !canDeleteRow}
                  >
                    <div className={styles.rowDeleteIcon}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Delete row</TooltipContent>
              </Tooltip>
            </div>

            <div className={styles.separator} />

            {/* Column operations */}
            <div className={styles.group}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.iconButton}
                    onClick={() => { onInsertColumnLeft(); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowLeftToLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Insert column left</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.iconButton}
                    onClick={() => { onInsertColumnRight(); }}
                    disabled={disabled || !hasSelection}
                  >
                    <ArrowRightToLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Insert column right</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`${styles.iconButton} ${styles.deleteButton}`}
                    onClick={() => { onDeleteColumn(); }}
                    disabled={disabled || !hasSelection || !canDeleteCol}
                  >
                    <div className={styles.colDeleteIcon}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Delete column</TooltipContent>
              </Tooltip>
            </div>

            {/* Merge cells (optional) */}
            {onMergeCells && (
              <>
                <div className={styles.separator} />
                <div className={styles.group}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={styles.iconButton}
                        onClick={() => { onMergeCells(); }}
                        disabled={disabled || !hasSelection}
                      >
                        <TableCellsMerge className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Toggle merge cells</TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}

            {/* Delete table (optional) */}
            {onDeleteTable && (
              <>
                <div className={styles.separator} />
                <div className={styles.group}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`${styles.iconButton} ${styles.deleteButton}`}
                        onClick={() => { onDeleteTable(); }}
                        disabled={disabled}
                      >
                        <TableIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Delete table</TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
};
