import { LayoutDashboard, Users, Plus, Target, Search, Kanban, HelpCircle, CreditCard, Crown } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Discover Leads", url: "/discover", icon: Search },
  { title: "All Leads", url: "/leads", icon: Users },
  { title: "Add Lead", url: "/add", icon: Plus },
  { title: "Pricing", url: "/pricing", icon: CreditCard },
  { title: "Help", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const { data: subscription } = useQuery<{
    planStatus: string;
    monthlyDiscoveriesUsed: number;
    discoveryLimit: number;
  }>({
    queryKey: ["/api/subscription"],
  });

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold" data-testid="text-app-title">LeadHunter</h2>
            <p className="text-xs text-muted-foreground">Find your next client</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} onClick={handleNavClick} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {subscription && (
          <Link href="/pricing" onClick={handleNavClick} data-testid="link-sidebar-plan">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover-elevate cursor-pointer">
              {subscription.planStatus === "pro" ? (
                <Crown className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">
                    {subscription.planStatus === "pro" ? "Pro Plan" : "Free Plan"}
                  </span>
                  {subscription.planStatus !== "pro" && (
                    <Badge variant="secondary" className="text-[9px]">Upgrade</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {subscription.monthlyDiscoveriesUsed}/{subscription.discoveryLimit} discoveries
                </p>
              </div>
            </div>
          </Link>
        )}
        {!subscription && (
          <p className="text-xs text-muted-foreground">Web Dev Lead Generator</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
