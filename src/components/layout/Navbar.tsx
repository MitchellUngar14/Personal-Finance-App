"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-terminal-bg-light border-b border-terminal-green/20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png?v=2"
              alt="Finance Tracker"
              width={36}
              height={36}
              className="w-8 h-8 sm:w-9 sm:h-9"
              unoptimized
            />
            <div className="text-terminal-green text-base sm:text-xl font-bold">
              <span className="hidden sm:inline">finance_tracker</span>
              <span className="sm:hidden">fin_trk</span>
            </div>
            <div className="hidden sm:block w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
          </Link>

          {/* Desktop Navigation Links */}
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

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-4">
            {session?.user && (
              <>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <div className="w-2 h-2 rounded-full bg-terminal-green" />
                  <span className="max-w-[150px] truncate">{session.user.email}</span>
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

          {/* Mobile Hamburger Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 text-terminal-green"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-6 h-0.5 bg-terminal-green transition-all duration-300 ${
                isMenuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-terminal-green transition-all duration-300 ${
                isMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-terminal-green transition-all duration-300 ${
                isMenuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-64 bg-terminal-bg-card border-l border-terminal-green/30 z-50 transform transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-green/20">
          <span className="text-terminal-green text-sm">
            <span className="text-terminal-cyan">~/</span>menu
          </span>
          <button
            onClick={closeMenu}
            className="text-terminal-magenta hover:text-terminal-magenta/80 text-xl"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`block px-4 py-3 text-sm transition-all ${
                  isActive
                    ? "text-terminal-green bg-terminal-green/10 border border-terminal-green/30"
                    : "text-text-secondary hover:text-terminal-green hover:bg-terminal-green/5 border border-transparent"
                }`}
              >
                <span className="text-terminal-cyan mr-2">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile User Section */}
        {session?.user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-terminal-green/20 bg-terminal-bg-light">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
              <div className="w-2 h-2 rounded-full bg-terminal-green" />
              <span className="truncate">{session.user.email}</span>
            </div>
            <button
              onClick={() => {
                closeMenu();
                signOut({ callbackUrl: "/login" });
              }}
              className="w-full text-terminal-magenta hover:text-terminal-magenta/80 text-sm py-2 border border-terminal-magenta/30 hover:bg-terminal-magenta/10 transition-colors"
            >
              [LOGOUT]
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
