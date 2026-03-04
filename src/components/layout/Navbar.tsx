"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface NavbarProps {
  userName?: string;
  userRole?: string;
}

export function Navbar({ userName, userRole }: NavbarProps) {
  const pathname = usePathname();

  const navItems = userRole === "teacher"
    ? [
        { href: "/teacher/dashboard", label: "Dashboard" },
      ]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard", label: "Experiments" },
      ];

  return (
    <nav className="h-14 bg-panel border-b border-border flex items-center px-4 gap-4 sticky top-0 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded bg-teal/20 border border-teal/40 flex items-center justify-center">
          <span className="text-teal font-orbitron font-bold text-xs">C</span>
        </div>
        <span className="font-orbitron font-bold text-white tracking-widest text-xs hidden sm:block">
          CHEMLAB LK
        </span>
      </Link>

      {/* Nav items */}
      <div className="flex items-center gap-1 ml-4">
        {navItems.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`px-3 py-1.5 rounded text-sm font-rajdhani font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "text-teal bg-teal/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex-1" />

      {/* Language toggle */}
      <LanguageToggle />

      {/* User */}
      {userName && (
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs font-rajdhani hidden sm:block">
            {userName}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-slate-500 hover:text-white text-xs font-rajdhani transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
