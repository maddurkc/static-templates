import { Layers, FileText, PlayCircle, Database, Network, FileCode, Settings } from "lucide-react";
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

const menuItems = [
  { title: "Sections", url: "/sections", icon: Layers },
  { title: "Static Templates", url: "/templates", icon: FileText },
  { title: "Run Templates", url: "/run-templates", icon: PlayCircle },
  { title: "Database Schema", url: "/database-schema", icon: Database },
  { title: "ER Diagram", url: "/er-diagram", icon: Network },
  { title: "SQL Migrations", url: "/migrations", icon: FileCode },
  { title: "Settings Demo", url: "/settings-demo", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground font-semibold text-sm px-2 py-3">
            Page Builder
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent font-medium"
                    >
                      <item.icon className="h-4 w-4" />
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
