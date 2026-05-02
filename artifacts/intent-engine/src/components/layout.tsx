import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Bookmark, Settings, Search, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Lead Explorer", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/keywords", label: "Keywords", icon: Settings2 },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground font-mono">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Activity className="h-5 w-5 text-primary mr-3" />
          <span className="font-bold text-lg text-primary tracking-tight">INTENT_ENGINE</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>v0.1.0-alpha</span>
          <Settings className="h-4 w-4" />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-6 md:hidden">
          <Activity className="h-5 w-5 text-primary mr-3" />
          <span className="font-bold text-lg text-primary">INTENT_ENGINE</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
