import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, FileText, Sparkles, Zap, Layout } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Welcome to PageBuilder</span>
          </div>
          
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
            Build Beautiful Pages
            <br />
            With Ease
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create stunning templates by dragging and dropping sections. 
            Customize every detail with our intuitive editor.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <Link to="/sections">
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <Layers className="mr-2 h-5 w-5" />
                Browse Sections
              </Button>
            </Link>
            <Link to="/templates">
              <Button size="lg" variant="outline">
                <FileText className="mr-2 h-5 w-5" />
                Build Static Template
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Rich Section Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access 19 different section types including headings, lists, tables, images, and more.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Drag & Drop Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Intuitive drag-and-drop interface with real-time preview. Reorder and customize with ease.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layout className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Full Customization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Customize fonts, colors, spacing, and more. Create nested sections for complex layouts.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <Card className="max-w-2xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to get started?</CardTitle>
              <CardDescription className="text-base">
                Choose a path to begin creating your perfect page
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 justify-center">
              <Link to="/sections">
                <Button variant="default">
                  Explore Sections
                </Button>
              </Link>
              <Link to="/templates">
                <Button variant="outline">
                  Build Static Template
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
