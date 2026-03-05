import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Layers, FileText, Sparkles, Zap, Layout, PlayCircle, Database,
  Network, FileCode, Settings, ArrowRight, CheckCircle2, Globe,
  Code2, Palette, Table2, Variable, LayoutTemplate, Mail
} from "lucide-react";
import styles from "./Index.module.scss";

const Index = () => {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>
            <Sparkles className="h-4 w-4" />
            <span>Template & Page Builder Platform</span>
          </div>

          <h1 className={styles.heroTitle}>
            Compose. Customize.
            <br />
            <span className={styles.heroTitleAccent}>Deliver.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Build dynamic email templates with drag-and-drop sections, live API data,
            Thymeleaf variables, and real-time preview — all in one powerful editor.
          </p>

          <div className={styles.heroActions}>
            <Link to="/templates">
              <Button size="lg" className={styles.primaryBtn}>
                <FileText className="mr-2 h-5 w-5" />
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/run-templates">
              <Button size="lg" variant="outline" className={styles.outlineBtn}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Run a Template
              </Button>
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>19+</span>
              <span className={styles.statLabel}>Section Types</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>Live</span>
              <span className={styles.statLabel}>API Integration</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>Real-time</span>
              <span className={styles.statLabel}>Preview</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Core Features</span>
            <h2 className={styles.sectionTitle}>Everything you need to build templates</h2>
            <p className={styles.sectionDesc}>
              A complete toolkit for creating, managing, and delivering dynamic templates.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <FeatureCard
              icon={<Layers />}
              title="Rich Section Library"
              description="19+ section types — headers, paragraphs, tables, images, lists, dividers, spacers, and nested containers."
              color="primary"
            />
            <FeatureCard
              icon={<Zap />}
              title="Drag & Drop Editor"
              description="Intuitive drag-and-drop with real-time reordering. Inline editing with rich text toolbar."
              color="accent"
            />
            <FeatureCard
              icon={<Palette />}
              title="Full Style Customization"
              description="Control fonts, colors, spacing, borders, and backgrounds per section with a visual style editor."
              color="primary"
            />
            <FeatureCard
              icon={<Variable />}
              title="Template Variables"
              description="Define {{placeholders}} in content. Fill them at runtime or bind them to live API responses."
              color="accent"
            />
            <FeatureCard
              icon={<Globe />}
              title="API Data Sources"
              description="Connect REST APIs with authentication, headers, and dot-notation response mapping."
              color="primary"
            />
            <FeatureCard
              icon={<Code2 />}
              title="Thymeleaf Support"
              description="Generate Thymeleaf-compatible HTML with th:text, th:each, and conditional expressions."
              color="accent"
            />
          </div>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className={styles.workflowSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>How It Works</span>
            <h2 className={styles.sectionTitle}>From blank canvas to delivered email</h2>
          </div>

          <div className={styles.stepsGrid}>
            <StepCard step="1" title="Pick Sections" description="Browse the library and add sections to your template canvas." />
            <StepCard step="2" title="Customize Content" description="Edit text, styles, and layout with the inline editor and style panel." />
            <StepCard step="3" title="Bind Data" description="Add variables and connect API data sources to populate dynamic content." />
            <StepCard step="4" title="Preview & Send" description="Switch to Run mode, fill placeholders, preview the result, and deliver." />
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Platform Tools</span>
            <h2 className={styles.sectionTitle}>More than just a template editor</h2>
          </div>

          <div className={styles.toolsGrid}>
            <ToolCard icon={<Layers />} title="Sections" description="Browse & preview all section types" to="/sections" />
            <ToolCard icon={<FileText />} title="Static Templates" description="Create and manage saved templates" to="/templates" />
            <ToolCard icon={<PlayCircle />} title="Run Templates" description="Execute templates with live data" to="/run-templates" />
            <ToolCard icon={<Database />} title="Database Schema" description="View and manage entity schemas" to="/database-schema" />
            <ToolCard icon={<Network />} title="ER Diagram" description="Visualize entity relationships" to="/er-diagram" />
            <ToolCard icon={<FileCode />} title="SQL Migrations" description="Generate migration scripts" to="/migrations" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <Mail className={styles.ctaIcon} />
          <h2 className={styles.ctaTitle}>Ready to build your first template?</h2>
          <p className={styles.ctaDesc}>
            Start with sections, compose your layout, add dynamic data, and preview instantly.
          </p>
          <div className={styles.ctaActions}>
            <Link to="/sections">
              <Button size="lg" className={styles.primaryBtn}>
                <Layers className="mr-2 h-5 w-5" />
                Explore Sections
              </Button>
            </Link>
            <Link to="/templates">
              <Button size="lg" variant="outline" className={styles.ctaOutlineBtn}>
                Build a Template
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: "primary" | "accent" }) {
  return (
    <Card className={styles.featureCard}>
      <CardHeader className="pb-3">
        <div className={`${styles.featureIcon} ${color === "accent" ? styles.accentIcon : ""}`}>
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className={styles.stepCard}>
      <div className={styles.stepNumber}>{step}</div>
      <h3 className={styles.stepTitle}>{title}</h3>
      <p className={styles.stepDesc}>{description}</p>
    </div>
  );
}

function ToolCard({ icon, title, description, to }: { icon: React.ReactNode; title: string; description: string; to: string }) {
  return (
    <Link to={to} className={styles.toolCardLink}>
      <Card className={styles.toolCard}>
        <CardContent className={styles.toolCardContent}>
          <div className={styles.toolIcon}>{icon}</div>
          <div>
            <h3 className={styles.toolTitle}>{title}</h3>
            <p className={styles.toolDesc}>{description}</p>
          </div>
          <ArrowRight className={styles.toolArrow} />
        </CardContent>
      </Card>
    </Link>
  );
}

export default Index;
