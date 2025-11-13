import { useState } from 'react';
import { Section } from '@/types/section';
import { sectionTypes } from '@/data/sectionTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DynamicSectionPanelProps {
  sections: Section[];
  onUpdateSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  onAddSection: (type: string) => void;
}

export const DynamicSectionPanel = ({
  sections,
  onUpdateSection,
  onDeleteSection,
  onAddSection,
}: DynamicSectionPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const renderVariableEditor = (section: Section) => {
    const sectionDef = sectionTypes.find(s => s.type === section.type);
    if (!sectionDef?.variables) return null;

    return (
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
        {sectionDef.variables.map((varDef) => {
          const currentValue = section.variables?.[varDef.name];

          if (varDef.type === 'list') {
            const items = (currentValue as string[]) || [];
            return (
              <div key={varDef.name} className="space-y-2">
                <Label className="text-xs">{varDef.label}</Label>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = e.target.value;
                        onUpdateSection({
                          ...section,
                          variables: {
                            ...section.variables,
                            [varDef.name]: newItems,
                          },
                        });
                      }}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newItems = items.filter((_, i) => i !== index);
                        onUpdateSection({
                          ...section,
                          variables: {
                            ...section.variables,
                            [varDef.name]: newItems,
                          },
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onUpdateSection({
                      ...section,
                      variables: {
                        ...section.variables,
                        [varDef.name]: [...items, ''],
                      },
                    });
                  }}
                  className="w-full text-xs"
                >
                  Add Item
                </Button>
              </div>
            );
          }

          return (
            <div key={varDef.name}>
              <Label className="text-xs">{varDef.label}</Label>
              <Input
                value={(currentValue as string) || ''}
                onChange={(e) => {
                  onUpdateSection({
                    ...section,
                    variables: {
                      ...section.variables,
                      [varDef.name]: e.target.value,
                    },
                  });
                }}
                placeholder={varDef.defaultValue as string}
                className="text-xs"
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-2">Dynamic Sections</h3>
        <p className="text-xs text-muted-foreground mb-3">
          These sections contain placeholders that can be filled with dynamic data
        </p>
        
        {/* Quick Add Buttons */}
        <div className="flex flex-wrap gap-2">
          {sectionTypes
            .filter(st => st.type === 'labeled-content' || st.type === 'text' || st.type === 'paragraph')
            .slice(0, 3)
            .map(st => (
              <Button
                key={st.type}
                size="sm"
                variant="outline"
                onClick={() => onAddSection(st.type)}
                className="text-xs"
              >
                + {st.label}
              </Button>
            ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {sections.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No dynamic sections added yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add sections with placeholders for dynamic content
              </p>
            </Card>
          ) : (
            sections.map((section) => {
              const sectionDef = sectionTypes.find(s => s.type === section.type);
              const isExpanded = expandedSections.has(section.id);

              return (
                <Collapsible
                  key={section.id}
                  open={isExpanded}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {sectionDef?.label || section.type}
                              </Badge>
                              {section.variables?.label && (
                                <span className="text-xs font-medium">
                                  {section.variables.label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {Object.keys(section.variables || {}).length} variable(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSection(section.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-3">
                        {renderVariableEditor(section)}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};