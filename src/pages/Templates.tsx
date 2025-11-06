import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, PlayCircle, Eye, Calendar, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  html: string;
  createdAt: string;
  sectionCount: number;
}

// Mock data - replace with actual data from database
const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Welcome Email Template",
    html: "<h1>Welcome {{name}}!</h1><p>Thank you for joining us.</p>",
    createdAt: "2024-01-15",
    sectionCount: 2,
  },
  {
    id: "2",
    name: "Newsletter Template",
    html: "<h1>{{title}}</h1><p>{{content}}</p><p>Best regards, {{sender}}</p>",
    createdAt: "2024-01-20",
    sectionCount: 3,
  },
  {
    id: "3",
    name: "Product Launch Template",
    html: "<h1>Introducing {{productName}}</h1><p>{{description}}</p><button>Learn More</button>",
    createdAt: "2024-01-25",
    sectionCount: 3,
  },
];

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates] = useState<Template[]>(mockTemplates);

  const handleRunTemplate = (template: Template) => {
    navigate('/run-templates', { state: { selectedTemplate: template } });
  };

  const handleCopyHTML = async (html: string, templateName: string) => {
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "HTML copied",
        description: `HTML for "${templateName}" copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy HTML to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    toast({
      title: "Template deleted",
      description: `"${name}" has been removed.`,
    });
  };

  const handlePreviewTemplate = (template: Template) => {
    toast({
      title: "Preview",
      description: "Opening template preview...",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Templates
            </h1>
            <p className="text-muted-foreground">
              Manage and organize your email templates
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => navigate('/templates/editor')}
            className="shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Template
          </Button>
        </div>

        {/* Templates Table */}
        <Card className="border-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Template Name</TableHead>
                <TableHead className="font-semibold">Sections</TableHead>
                <TableHead className="font-semibold">Created Date</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-muted p-4">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No templates yet</p>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/templates/editor')}
                      >
                        Create Your First Template
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {template.sectionCount} sections
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunTemplate(template)}
                          className="shadow-sm"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Run
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewTemplate(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyHTML(template.html, template.name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default Templates;
