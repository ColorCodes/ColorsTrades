"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut, TrendingUp } from "lucide-react";
import { NAV, MOBILE_MORE } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function AppShell({ user, children }: { user: { email: string; name: string | null }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const primary = NAV.filter((n) => n.primaryOnMobile);
  const secondary = NAV.filter((n) => !n.primaryOnMobile);
  const mobileTabs = [...primary, MOBILE_MORE];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:border-r md:bg-card md:min-h-[100dvh] md:sticky md:top-0">
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <TrendingUp className="size-5 text-primary" />
          <span className="font-semibold">ColorsTrades</span>
        </div>
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 flex flex-col gap-1">
          <div className="text-xs text-muted-foreground truncate" title={user.email}>{user.email}</div>
          <Button variant="ghost" size="sm" className="justify-start gap-2 px-2" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-3 py-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="size-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="px-4 py-4 border-b">
              <SheetTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-primary" /> ColorsTrades</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-0.5 p-2">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-sm",
                        active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
            <div className="border-t mt-2 p-3 flex flex-col gap-2">
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 font-semibold">
          <TrendingUp className="size-5 text-primary" /> ColorsTrades
        </div>
        <div className="w-10" aria-hidden />
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-4 sm:py-8">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur safe-area-pb"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5">
          {mobileTabs.map((item) => {
            const isMore = item.href === "#more";
            const active = !isMore && (pathname === item.href || pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            const content = (
              <div className={cn("flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="size-5" />
                <span className="leading-none">{item.label}</span>
              </div>
            );
            return (
              <li key={item.label}>
                {isMore ? (
                  <button type="button" onClick={() => setMoreOpen(true)} className="w-full" aria-label="More">
                    {content}
                  </button>
                ) : (
                  <Link href={item.href} aria-current={active ? "page" : undefined} className="block">
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {secondary.map((item) => {
              const Icon = item.icon;
              return (
                <SheetClose asChild key={item.href}>
                  <Link href={item.href} className="flex flex-col items-center justify-center rounded-lg border p-4 gap-2 text-sm hover:bg-accent">
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                </SheetClose>
              );
            })}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex flex-col items-center justify-center rounded-lg border p-4 gap-2 text-sm hover:bg-accent"
            >
              <LogOut className="size-5" /> Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
