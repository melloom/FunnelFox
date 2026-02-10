import { LayoutDashboard, Users, Plus, Search, Kanban, HelpCircle, CreditCard, Crown, Settings, Briefcase, FolderOpen, TrendingUp, Filter, RefreshCw, Target, Bookmark, ListChecks } from "lucide-react";
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

const leadGenerationNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Discover Leads", url: "/discover", icon: Search },
  { title: "All Leads", url: "/leads", icon: Users },
  { title: "Add Lead", url: "/add", icon: Plus },
  { title: "Ongoing Projects", url: "/projects", icon: FolderOpen },
  { title: "Find Work", url: "/find-work", icon: Briefcase },
];

const findWorkNavItems = [
  { title: "Find Work", url: "/find-work", icon: Briefcase },
  { title: "Scraped Jobs", url: "/scraped-jobs", icon: ListChecks },
  { title: "Saved Jobs", url: "/saved-jobs", icon: Bookmark },
  { title: "Back to CRM", url: "/", icon: LayoutDashboard },
];

const bottomNavItems = [
  { title: "Subscription", url: "/subscription", icon: CreditCard },
  { title: "Account", url: "/account", icon: Settings },
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

  const findWorkPaths = ["/find-work", "/scraped-jobs", "/saved-jobs"];
  const isFindWorkSection = findWorkPaths.includes(location);
  const currentNavItems = isFindWorkSection ? findWorkNavItems : leadGenerationNavItems;
  const currentGroupLabel = isFindWorkSection ? "Job Search" : "Navigation";
  const currentSubtitle = isFindWorkSection ? "Find your next opportunity" : "Find your next client";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img
            src="/favicon-32x32.png"
            alt="FunnelFox"
            className="w-8 h-8 rounded-md"
            data-testid="img-sidebar-logo"
          />
          <div>
            <h2 className="text-sm font-semibold" data-testid="text-app-title">FunnelFox</h2>
            <p className="text-xs text-muted-foreground">{currentSubtitle}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{currentGroupLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentNavItems.map((item) => (
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
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => (
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
          <Link href="/subscription" onClick={handleNavClick} data-testid="link-sidebar-plan">
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
                  {subscription.monthlyDiscoveriesUsed}/{subscription.discoveryLimit === 999 ? "Unlimited" : subscription.discoveryLimit} leads this month
                </p>
              </div>
            </div>
          </Link>
        )}
        {!subscription && (
          <p className="text-xs text-muted-foreground">Web Dev Lead Generator</p>
        )}
        <div className="flex items-center gap-3 pt-2 border-t mt-2">
          <Link href="/terms" onClick={handleNavClick}>
            <span className="text-[10px] text-muted-foreground underline cursor-pointer" data-testid="link-sidebar-terms">Terms</span>
          </Link>
          <Link href="/privacy" onClick={handleNavClick}>
            <span className="text-[10px] text-muted-foreground underline cursor-pointer" data-testid="link-sidebar-privacy">Privacy</span>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
