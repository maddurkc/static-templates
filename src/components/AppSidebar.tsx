import { Layers, FileText, PlayCircle, Database, Network, FileCode } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import styles from "./AppSidebar.module.scss";

const menuItems = [
  { title: "Sections", url: "/sections", icon: Layers },
  { title: "Static Templates", url: "/templates", icon: FileText },
  { title: "Run Templates", url: "/run-templates", icon: PlayCircle },
  { title: "Database Schema", url: "/database-schema", icon: Database },
  { title: "ER Diagram", url: "/er-diagram", icon: Network },
  { title: "SQL Migrations", url: "/migrations", icon: FileCode },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className={styles.sidebar}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={styles.groupLabel}>
            Page Builder
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={styles.menuItem}
                      activeClassName={styles.active}
                    >
                      <item.icon className={styles.icon} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
