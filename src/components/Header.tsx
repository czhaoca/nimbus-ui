"use client";

import { CheckCircle, AlertTriangle, LogOut, User, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useHealth } from "@/lib/hooks/useApi";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onLogout?: () => void;
  currentUser?: { username: string; role: string } | null;
}

export function Header({ onLogout, currentUser }: HeaderProps) {
  const { data: health } = useHealth();
  const connected = health?.status === "ok";
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <span className="text-xs text-muted-foreground hidden md:block">
        v{health?.version ?? "..."}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant={connected ? "outline" : "destructive"} className="gap-1.5 text-xs">
          {connected ? (
            <><CheckCircle className="size-3" /> Connected</>
          ) : (
            <><AlertTriangle className="size-3" /> Offline</>
          )}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              {theme === "dark" ? <Sun className="size-4" /> : theme === "system" ? <Monitor className="size-4" /> : <Moon className="size-4" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="size-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
                <User className="size-3.5" />
                <span className="hidden sm:inline">{currentUser.username}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">
                  {currentUser.role}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{currentUser.username}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onLogout && (
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
