import { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Copy, Clipboard, ClipboardPaste, Trash2 } from "lucide-react";

interface SectionContextMenuProps {
  children: ReactNode;
  onDuplicate: () => void;
  onCopyStyles: () => void;
  onPasteStyles: () => void;
  onDelete: () => void;
}

export const SectionContextMenu = ({
  children,
  onDuplicate,
  onCopyStyles,
  onPasteStyles,
  onDelete,
}: SectionContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate Section
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCopyStyles}>
          <Clipboard className="h-4 w-4 mr-2" />
          Copy Styles
        </ContextMenuItem>
        <ContextMenuItem onClick={onPasteStyles}>
          <ClipboardPaste className="h-4 w-4 mr-2" />
          Paste Styles
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Section
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
