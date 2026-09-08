"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Personal", href: "#personal" },
  { label: "Business", href: "#business" },
  { label: "Company", href: "#company" },
  { label: "Resources", href: "#resources" },
  { label: "Support", href: "#support" },
];

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/[0.08] bg-[#F7F3EA]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="-ml-2 flex items-center gap-2.5"
          aria-label="Arivo home"
        >
          <Image
            src="/arivo-icon-black.png"
            alt="Arivo"
            width={34}
            height={34}
            className="h-[34px] w-auto object-contain"
            priority
          />

          <span className="text-[22px] font-bold tracking-[-0.04em] text-[#111111]">
            Arivo
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-1.5 text-[14px] font-medium text-[#222222] transition-opacity hover:opacity-60"
            >
              {item.label}
              <ChevronDown size={14} strokeWidth={1.8} />
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-full border border-black/20 px-6 text-[14px] font-semibold text-[#111111] transition hover:bg-black/[0.04]"
          >
            Log in
          </Link>

          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-full bg-[#111111] px-6 text-[14px] font-semibold text-white transition hover:bg-[#252525]"
          >
            Get started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-[#111111] lg:hidden"
        >
          {mobileOpen ? (
            <X size={21} strokeWidth={1.8} />
          ) : (
            <Menu size={21} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="border-t border-black/[0.08] bg-[#F7F3EA] px-5 pb-6 pt-4 lg:hidden">
          <nav className="flex flex-col">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between border-b border-black/[0.08] py-4 text-[15px] font-medium text-[#111111]"
              >
                <span>{item.label}</span>
                <ChevronDown size={16} strokeWidth={1.8} />
              </a>
            ))}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex h-12 items-center justify-center rounded-full border border-black/20 text-[14px] font-semibold text-[#111111]"
              >
                Log in
              </Link>

              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex h-12 items-center justify-center rounded-full bg-[#111111] text-[14px] font-semibold text-white"
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}