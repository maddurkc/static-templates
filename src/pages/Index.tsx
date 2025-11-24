import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, FileText, Sparkles, Zap, Layout } from "lucide-react";
import styles from "./Index.module.scss";

const Index = () => {
  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.badge}>
            <Sparkles />
            <span>Welcome to PageBuilder</span>
          </div>
          
          <h1 className={styles.heroTitle}>
            Build Beautiful Pages
            <br />
            With Ease
          </h1>
          
          <p className={styles.heroSubtitle}>
            Create stunning templates by dragging and dropping sections. 
            Customize every detail with our intuitive editor.
          </p>

          <div className={styles.heroActions}>
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
        <div className={styles.features}>
          <Card className={styles.featureCard}>
            <CardHeader>
              <div className={styles.featureIcon}>
                <Layers />
              </div>
              <CardTitle>Rich Section Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access 19 different section types including headings, lists, tables, images, and more.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className={styles.featureCard}>
            <CardHeader>
              <div className={`${styles.featureIcon} ${styles.accent}`}>
                <Zap />
              </div>
              <CardTitle>Drag & Drop Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Intuitive drag-and-drop interface with real-time preview. Reorder and customize with ease.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className={styles.featureCard}>
            <CardHeader>
              <div className={styles.featureIcon}>
                <Layout />
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
        <div className={styles.cta}>
          <Card className={styles.ctaCard}>
            <CardHeader>
              <CardTitle className={styles.ctaTitle}>Ready to get started?</CardTitle>
              <CardDescription className={styles.ctaDescription}>
                Choose a path to begin creating your perfect page
              </CardDescription>
            </CardHeader>
            <CardContent className={styles.ctaActions}>
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
