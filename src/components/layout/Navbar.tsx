"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/", label: "Dashboard", icon: ">" },
  { href: "/import", label: "Import", icon: "+" },
  { href: "/charts", label: "Charts", icon: "#" },
  { href: "/history", label: "History", icon: "@" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="bg-terminal-bg-light border-b border-terminal-green/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-terminal-green text-xl font-bold">
              <span className="text-terminal-cyan">$</span> finance_tracker
            </div>
            <div className="hidden sm:block w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-sm transition-all ${
                    isActive
                      ? "text-terminal-green bg-terminal-green/10 border border-terminal-green/30"
                      : "text-text-secondary hover:text-terminal-green hover:bg-terminal-green/5"
                  }`}
                >
                  <span className="text-terminal-cyan mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {session?.user && (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-text-muted">
                  <div className="w-2 h-2 rounded-full bg-terminal-green" />
                  <span>{session.user.email}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-terminal-magenta hover:text-terminal-magenta/80 text-sm transition-colors"
                >
                  [logout]
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? "text-terminal-green bg-terminal-green/10 border border-terminal-green/30"
                    : "text-text-secondary hover:text-terminal-green"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
