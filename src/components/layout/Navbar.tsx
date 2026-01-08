"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiresRJ?: boolean;
  requiresImports?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: "~" },
  { href: "/portfolio", label: "Portfolio", icon: ">", requiresImports: true },
  { href: "/accounts", label: "Accounts", icon: "$" },
  { href: "/charts", label: "Charts", icon: "#" },
  { href: "/import", label: "Import", icon: "+" },
  { href: "/history", label: "History", icon: "@", requiresImports: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasRJData, setHasRJData] = useState(false);
  const [hasAnyImports, setHasAnyImports] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Track mount state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user has data (refresh on route change to catch new imports)
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/snapshots")
        .then((res) => res.json())
        .then((data) => {
          const snapshots = data.snapshots || [];
          setHasAnyImports(snapshots.length > 0);
          setHasRJData(snapshots.some((s: { source: string }) => s.source === "raymond_james"));
        })
        .catch(() => {
          setHasRJData(false);
          setHasAnyImports(false);
        });
    }
  }, [status, pathname]);

  // Close menu when route changes
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  // Filter nav items based on data availability
  const visibleNavItems = navItems.filter((item) => {
    if (item.requiresRJ && !hasRJData) return false;
    if (item.requiresImports && !hasAnyImports) return false;
    return true;
  });

  return (
    <>
    <nav className="bg-terminal-bg-light border-b border-terminal-green/20 relative sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative">
              <Image
                src="/logo.png?v=2"
                alt="Finance Tracker"
                width={36}
                height={36}
                className="w-8 h-8 sm:w-9 sm:h-9 group-hover:scale-110 transition-transform"
                unoptimized
              />
              <div className="absolute -inset-1 bg-terminal-green/20 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-terminal-green text-base sm:text-xl font-bold tracking-tight">
              <span className="hidden sm:inline">finance_tracker</span>
              <span className="sm:hidden">fin_trk</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-sm transition-all relative group ${isActive
                    ? "text-terminal-green"
                    : "text-text-secondary hover:text-terminal-green"
                    }`}
                >
                  <span className="text-terminal-cyan mr-1">{item.icon}</span>
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-terminal-green/10 border border-terminal-green/30 -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 bg-terminal-green/5 border border-transparent group-hover:border-terminal-green/10 -z-10 opacity-0 group-hover:opacity-100 transition-all" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-4">
            {session?.user && (
              <>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-terminal-green shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
                  <span className="max-w-[150px] truncate">{session.user.email}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-terminal-magenta hover:text-terminal-magenta/80 text-xs transition-colors border border-terminal-magenta/20 px-2 py-1 hover:bg-terminal-magenta/5"
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
            <motion.span
              animate={isMenuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
              className="block w-6 h-0.5 bg-terminal-green origin-center"
            />
            <motion.span
              animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="block w-6 h-0.5 bg-terminal-green"
            />
            <motion.span
              animate={isMenuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
              className="block w-6 h-0.5 bg-terminal-green origin-center"
            />
          </button>
        </div>
      </div>

    </nav>

      {/* Mobile Menu Overlay - Rendered via Portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                onClick={closeMenu}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="md:hidden fixed top-0 right-0 h-full w-[80%] max-w-[300px] bg-terminal-bg-card border-l border-terminal-green/30 z-[110] flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-5 border-b border-terminal-green/20 bg-terminal-bg-light">
                  <span className="text-terminal-green text-base flex items-center gap-2 font-bold">
                    <span className="text-terminal-cyan">~/</span>MENU
                    <div className="w-2 h-2 rounded-full bg-terminal-green shadow-[0_0_8px_rgba(0,255,136,0.6)] animate-pulse" />
                  </span>
                  <button
                    onClick={closeMenu}
                    className="text-terminal-magenta hover:bg-terminal-magenta/10 text-3xl w-10 h-10 flex items-center justify-center border border-terminal-magenta/20 transition-colors"
                    aria-label="Close menu"
                  >
                    ×
                  </button>
                </div>

                {/* Mobile Navigation Links */}
                <div className="p-5 space-y-3 flex-grow overflow-y-auto">
                  {visibleNavItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className={`flex items-center gap-4 px-5 py-4 text-base transition-all border ${isActive
                              ? "text-terminal-green bg-terminal-green/10 border-terminal-green/40 shadow-[inset_0_0_10px_rgba(0,255,136,0.1)]"
                              : "text-text-secondary hover:text-terminal-green hover:bg-terminal-green/5 border-transparent"
                            }`}
                        >
                          <span className="text-terminal-cyan text-lg w-6">{item.icon}</span>
                          <span className="font-medium tracking-wide">{item.label}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Mobile User Section */}
                {session?.user && (
                  <div className="p-4 border-t border-terminal-green/20 bg-terminal-bg-light">
                    <div className="flex items-center gap-2 text-[10px] text-text-muted mb-3 italic">
                      <div className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
                      <span className="truncate">{session.user.email}</span>
                    </div>
                    <button
                      onClick={() => {
                        closeMenu();
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="w-full text-terminal-magenta hover:text-terminal-magenta/80 text-xs py-2.5 border border-terminal-magenta/30 hover:bg-terminal-magenta/10 transition-colors tracking-widest uppercase font-bold"
                    >
                      [ DISCONNECT ]
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
