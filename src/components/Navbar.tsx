"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, TrendingUp, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Signals", href: "/signals" },
  { label: "Bots", href: "/bots" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, isAuthenticated, isLoading } = useAuth();
  const dashboardHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const displayName = (
    profile?.full_name ||
    user?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    ""
  ).trim();
  const initials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-dark-950/95 backdrop-blur-md border-b border-dark-800"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-dark-950" />
            </div>
            <span className="text-xl font-bold gold-gradient-text hidden sm:block">
              LOGICTRADERSLTD
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop account actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {!isLoading && isAuthenticated ? (
              <Link
                href={dashboardHref}
                className="flex items-center gap-3 rounded-full border border-gold-500/20 bg-dark-900/70 py-1.5 pl-1.5 pr-4 transition-colors hover:border-gold-500/50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/15 text-sm font-bold text-gold-300">
                  {initials || <UserRound className="h-4 w-4" />}
                </span>
                <span className="max-w-36 truncate text-sm font-medium text-white">
                  {displayName || "My account"}
                </span>
                <span className="text-xs text-gold-400">
                  {user?.role === "admin" ? "Admin" : "Dashboard"}
                </span>
              </Link>
            ) : !isLoading ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-300 hover:text-gold-400 transition-colors"
                >
                  Login
                </Link>
                <Link href="/register" className="gold-button text-sm">
                  Register
                </Link>
              </>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-dark-800 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gold-400" />
            ) : (
              <Menu className="w-6 h-6 text-gold-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-dark-950/98 backdrop-blur-md border-b border-dark-800"
          >
            <div className="px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 text-gray-300 hover:text-gold-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-dark-800 space-y-3">
                {!isLoading && isAuthenticated ? (
                  <Link
                    href={dashboardHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-gold-500/20 bg-dark-900/70 p-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-sm font-bold text-gold-300">
                      {initials || <UserRound className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">
                        {displayName || "My account"}
                      </span>
                      <span className="block text-sm text-gold-400">
                        {user?.role === "admin" ? "Admin dashboard" : "Go to dashboard"}
                      </span>
                    </span>
                  </Link>
                ) : !isLoading ? (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-2 text-gray-300 hover:text-gold-400 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center gold-button"
                    >
                      Register
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
