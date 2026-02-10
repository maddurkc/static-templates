import { useState } from "react";
import { Settings, LayoutGrid, PanelLeft, ListCollapse, Maximize2, Share2, Users, Bell, Wrench, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import styles from "./SettingsLayoutDemo.module.scss";

const CATEGORIES = [
  { id: "delegates", label: "Delegates", icon: Share2 },
  { id: "subscribers", label: "Subscribers", icon: Bell },
  { id: "config", label: "Configuration", icon: Wrench },
];

const SAMPLE_USERS = [
  { name: "Alice Johnson", email: "alice@company.com", type: "extended" },
  { name: "Bob Smith", email: "bob@company.com", type: "exclusive" },
  { name: "Carol Davis", email: "carol@company.com", type: "extended" },
];

const DelegatesContent = () => (
  <div>
    <div className={styles.searchBox}>
      <Search /> Add people by name or email...
    </div>
    {SAMPLE_USERS.map((u) => (
      <div key={u.email} className={styles.userRow}>
        <div className={styles.userAvatar}>{u.name.split(" ").map(p => p[0]).join("")}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{u.name}</div>
          <div className={styles.userEmail}>{u.email}</div>
        </div>
        <span className={`${styles.badge} ${styles[u.type]}`}>{u.type}</span>
      </div>
    ))}
  </div>
);

const SubscribersContent = () => (
  <div>
    <div className={styles.settingItem}>
      <div>
        <div className={styles.settingLabel}>Email notifications</div>
        <div className={styles.settingDesc}>Notify subscribers when template changes</div>
      </div>
      <div className={styles.settingControl}><Switch defaultChecked /></div>
    </div>
    <div className={styles.settingItem}>
      <div>
        <div className={styles.settingLabel}>Run completion alerts</div>
        <div className={styles.settingDesc}>Alert when a template run finishes</div>
      </div>
      <div className={styles.settingControl}><Switch /></div>
    </div>
    <div className={styles.settingItem}>
      <div>
        <div className={styles.settingLabel}>Weekly digest</div>
        <div className={styles.settingDesc}>Send a weekly summary of template usage</div>
      </div>
      <div className={styles.settingControl}><Switch /></div>
    </div>
  </div>
);

const ConfigContent = () => (
  <div>
    <div className={styles.settingItem}>
      <div>
        <div className={styles.settingLabel}>Auto-save drafts</div>
        <div className={styles.settingDesc}>Automatically save template changes</div>
      </div>
      <div className={styles.settingControl}><Switch defaultChecked /></div>
    </div>
    <div className={styles.settingItem}>
      <div>
        <div className={styles.settingLabel}>Version history</div>
        <div className={styles.settingDesc}>Keep track of template revisions</div>
      </div>
      <div className={styles.settingControl}><Switch defaultChecked /></div>
    </div>
    <div className={styles.settingItem}>
      <div>
        <div className={styles.settingLabel}>API integration</div>
        <div className={styles.settingDesc}>Enable external API data fetching</div>
      </div>
      <div className={styles.settingControl}><Switch /></div>
    </div>
  </div>
);

const CONTENT_MAP: Record<string, React.ReactNode> = {
  delegates: <DelegatesContent />,
  subscribers: <SubscribersContent />,
  config: <ConfigContent />,
};

const OPTIONS = [
  { id: "tabbed", label: "Tabbed Panel", desc: "Horizontal tabs in a compact popover", icon: LayoutGrid },
  { id: "sidebar", label: "Sidebar + Content", desc: "Left nav with content area", icon: PanelLeft },
  { id: "accordion", label: "Accordion Sections", desc: "Collapsible stacked panels", icon: ListCollapse },
  { id: "fullpage", label: "Full Settings Page", desc: "Dedicated page with left nav", icon: Maximize2 },
];

// ─── Option 1: Tabbed Panel ───
const TabbedDemo = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
    <div className={styles.tabbedPanel}>
      <div className={styles.tabbedHeader}>
        <Settings /> Template Settings
      </div>
      <div className={styles.tabbedBody}>
        <Tabs defaultValue="delegates">
          <TabsList className="w-full mt-3 mb-4">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="flex-1 text-xs gap-1.5">
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORIES.map((c) => (
            <TabsContent key={c.id} value={c.id}>
              {CONTENT_MAP[c.id]}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  </div>
);

// ─── Option 2: Sidebar + Content ───
const SidebarDemo = () => {
  const [active, setActive] = useState("delegates");
  const cat = CATEGORIES.find((c) => c.id === active)!;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <div className={styles.sidebarLayout}>
        <div className={styles.sidebarNav}>
          <div className={styles.sidebarNavTitle}>Settings</div>
          {CATEGORIES.map((c) => (
            <div
              key={c.id}
              className={`${styles.sidebarNavItem} ${active === c.id ? styles.active : ""}`}
              onClick={() => setActive(c.id)}
            >
              <c.icon /> {c.label}
            </div>
          ))}
        </div>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarContentTitle}>{cat.label}</div>
          <div className={styles.sidebarContentDesc}>Manage {cat.label.toLowerCase()} settings for this template</div>
          <Separator className="mb-4" />
          {CONTENT_MAP[active]}
        </div>
      </div>
    </div>
  );
};

// ─── Option 3: Accordion ───
const AccordionDemo = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
    <div className={styles.accordionPanel}>
      <div className={styles.accordionHeader}>
        <Settings /> Template Settings
      </div>
      <Accordion type="single" defaultValue="delegates" collapsible>
        {CATEGORIES.map((c) => (
          <AccordionItem key={c.id} value={c.id}>
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <c.icon className={styles.accordionIcon} />
                {c.label}
              </span>
            </AccordionTrigger>
            <AccordionContent>{CONTENT_MAP[c.id]}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </div>
);

// ─── Option 4: Full Page ───
const FullPageDemo = () => {
  const [active, setActive] = useState("delegates");
  const cat = CATEGORIES.find((c) => c.id === active)!;
  return (
    <div className={styles.demoContainer}>
      <div className={styles.fullPageLayout}>
        <div className={styles.fullPageNav}>
          <div className={styles.fullPageNavTitle}>
            <Settings /> Settings
          </div>
          {CATEGORIES.map((c) => (
            <div
              key={c.id}
              className={`${styles.fullPageNavItem} ${active === c.id ? styles.active : ""}`}
              onClick={() => setActive(c.id)}
            >
              <c.icon /> {c.label}
            </div>
          ))}
        </div>
        <div className={styles.fullPageContent}>
          <div className={styles.fullPageContentTitle}>{cat.label}</div>
          <div className={styles.fullPageContentDesc}>Manage {cat.label.toLowerCase()} settings for this template</div>
          <Separator className="mb-5" />
          {CONTENT_MAP[active]}
        </div>
      </div>
    </div>
  );
};

const DEMOS: Record<string, React.FC> = {
  tabbed: TabbedDemo,
  sidebar: SidebarDemo,
  accordion: AccordionDemo,
  fullpage: FullPageDemo,
};

export default function SettingsLayoutDemo() {
  const [selected, setSelected] = useState("tabbed");
  const Demo = DEMOS[selected];

  return (
    <div className={styles.demoPage}>
      <h1 className={styles.demoTitle}>Settings Layout Options</h1>
      <p className={styles.demoSubtitle}>
        Click each option to see how template settings (Delegates, Subscribers, Config) would look.
      </p>

      <div className={styles.buttonsGrid}>
        {OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className={`${styles.optionCard} ${selected === opt.id ? styles.active : ""}`}
            onClick={() => setSelected(opt.id)}
          >
            <opt.icon className={styles.optionIcon} />
            <div className={styles.optionLabel}>{opt.label}</div>
            <div className={styles.optionDesc}>{opt.desc}</div>
          </div>
        ))}
      </div>

      <Demo />
    </div>
  );
}
