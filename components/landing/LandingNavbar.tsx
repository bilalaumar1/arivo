"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type React from "react";

type MenuItem = {
  label: string;
  href: string;
  external?: boolean;
};

type NavItem = {
  label: string;
  items: MenuItem[];
};

const navItems: NavItem[] = [
  {
    label: "Personal",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Send", href: "/send" },
      { label: "Receive", href: "/receive" },
      { label: "Transactions", href: "/transactions" },
      { label: "Contacts", href: "/contacts" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Merchant", href: "/merchant" },
      { label: "Orders", href: "/orders" },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "Arivo", href: "/" },
      { label: "What is Arivo", href: "#what-is-arivo" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "FAQ", href: "#faq" },
      { label: "How Arivo Works", href: "#how-arivo-works" },
    ],
  },
  {
    label: "Support",
    items: [
      {
        label: "X",
        href: "https://x.com/tryarivo",
        external: true,
      },
      {
        label: "Contact",
        href: "mailto:support@arivopay.xyz",
        external: true,
      },
    ],
  },
];

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest("[data-nav-menu]")) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDesktopMenu = (label: string) => {
    setOpenMenu((current) => (current === label ? null : label));
  };

  const handleMobileMenu = (label: string) => {
    setMobileExpanded((current) => (current === label ? null : label));
  };

  const handleMobileLink = () => {
    setMobileOpen(false);
    setMobileExpanded(null);
  };

  const scrollToSection = (href: string) => {
    if (!href.startsWith("#")) return;

    const id = href.slice(1);

    // The landing page sections do not currently expose these IDs.
    // Resolve the visible section by its actual heading text instead.
    const wantedText =
      id === "faq"
        ? "faq"
        : id === "how-arivo-works"
          ? "how arivo works"
          : id === "what-is-arivo"
            ? "what is arivo"
            : "";

    let target: HTMLElement | null = document.getElementById(id);

    if (!target && wantedText) {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          "h1, h2, h3, h4, h5, h6, p, span, div"
        )
      );

      target =
        candidates.find((element) => {
          const text = element.textContent
            ?.replace(/\\s+/g, " ")
            .trim()
            .toLowerCase();

          return text === wantedText;
        }) ?? null;
    }

    if (target) {
      const headerOffset = 76;
      const top =
        target.getBoundingClientRect().top +
        window.scrollY -
        headerOffset;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });

      window.history.replaceState(null, "", href);
      return;
    }

    // If the page has not finished rendering yet, retry once after the
    // current render cycle instead of leaving the user at the top.
    window.requestAnimationFrame(() => {
      const retryCandidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          "h1, h2, h3, h4, h5, h6, p, span, div"
        )
      );

      const retryTarget =
        retryCandidates.find((element) => {
          const text = element.textContent
            ?.replace(/\\s+/g, " ")
            .trim()
            .toLowerCase();

          return text === wantedText;
        }) ?? null;

      if (retryTarget) {
        const headerOffset = 76;
        const top =
          retryTarget.getBoundingClientRect().top +
          window.scrollY -
          headerOffset;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: "smooth",
        });

        window.history.replaceState(null, "", href);
      } else {
        window.location.hash = id;
      }
    });
  };

  const handleSectionLink = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("#")) return;

    event.preventDefault();
    scrollToSection(href);

    setOpenMenu(null);
    setMobileOpen(false);
    setMobileExpanded(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/[0.08] bg-[#F7F3EA]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="-ml-2 flex items-center gap-2.5"
          aria-label="Arivo home"
          onClick={() => {
            setOpenMenu(null);
            setMobileOpen(false);
          }}
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
          {navItems.map((item) => {
            const isOpen = openMenu === item.label;

            return (
              <div
                key={item.label}
                className="relative"
                data-nav-menu
              >
                <button
                  type="button"
                  onClick={() => handleDesktopMenu(item.label)}
                  aria-expanded={isOpen}
                  className="flex items-center gap-1.5 text-[14px] font-medium text-[#222222] transition-opacity hover:opacity-60"
                >
                  {item.label}

                  <ChevronDown
                    size={14}
                    strokeWidth={1.8}
                    className={`transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  item.label === "Personal" ? (
                    <div className="fixed left-1/2 top-[68px] z-[60] w-[980px] max-w-[calc(100vw-40px)] -translate-x-1/2 rounded-b-[24px] border border-black/[0.08] bg-[#F7F3EA] px-10 py-9 shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
                      <div className="grid grid-cols-3 gap-10">
                        <div>
                          <p className="mb-5 text-[14px] font-semibold text-[#222222]">Wallet</p>
                          <div className="flex flex-col gap-5">
                            <Link href="/dashboard" onClick={() => setOpenMenu(null)} className="text-[15px] font-medium text-[#222222] transition-opacity hover:opacity-55">Dashboard</Link>
                            <Link href="/contacts" onClick={() => setOpenMenu(null)} className="text-[15px] font-medium text-[#222222] transition-opacity hover:opacity-55">Contacts</Link>
                          </div>
                        </div>

                        <div>
                          <p className="mb-5 text-[14px] font-semibold text-[#222222]">Send &amp; Receive</p>
                          <div className="flex flex-col gap-5">
                            <Link href="/send" onClick={() => setOpenMenu(null)} className="text-[15px] font-medium text-[#222222] transition-opacity hover:opacity-55">Send</Link>
                            <Link href="/receive" onClick={() => setOpenMenu(null)} className="text-[15px] font-medium text-[#222222] transition-opacity hover:opacity-55">Receive</Link>
                          </div>
                        </div>

                        <div>
                          <p className="mb-5 text-[14px] font-semibold text-[#222222]">Manage</p>
                          <div className="flex flex-col gap-5">
                            <Link href="/transactions" onClick={() => setOpenMenu(null)} className="text-[15px] font-medium text-[#222222] transition-opacity hover:opacity-55">Transactions</Link>
                            <Link href="/settings" onClick={() => setOpenMenu(null)} className="text-[15px] font-medium text-[#222222] transition-opacity hover:opacity-55">Settings</Link>
                          </div>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div className="absolute left-1/2 top-[calc(100%+18px)] w-[220px] -translate-x-1/2 rounded-2xl border border-black/[0.08] bg-[#F7F3EA] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.10)]">
                      <div className="flex flex-col">
                        {item.items.map((subItem) =>
                          subItem.external ? (
                            <a key={`${item.label}-${subItem.label}`} href={subItem.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpenMenu(null)} className="rounded-xl px-4 py-3 text-[14px] font-medium text-[#222222] transition-colors hover:bg-black/[0.05]">
                              {subItem.label}
                            </a>
                          ) : (
                            <Link key={`${item.label}-${subItem.label}`} href={subItem.href} onClick={(event) => {
                              if (subItem.href.startsWith("#")) {
                                handleSectionLink(event, subItem.href);
                              } else {
                                setOpenMenu(null);
                              }
                            }} className="rounded-xl px-4 py-3 text-[14px] font-medium text-[#222222] transition-colors hover:bg-black/[0.05]">
                              {subItem.label}
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
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
          onClick={() => {
            setMobileOpen((value) => !value);
            setMobileExpanded(null);
            setOpenMenu(null);
          }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
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
            {navItems.map((item) => {
              const isExpanded = mobileExpanded === item.label;

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => handleMobileMenu(item.label)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between border-b border-black/[0.08] py-4 text-left text-[15px] font-medium text-[#111111]"
                  >
                    <span>{item.label}</span>

                    <ChevronDown
                      size={16}
                      strokeWidth={1.8}
                      className={`transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-b border-black/[0.08] py-2">
                      {item.items.map((subItem) =>
                        subItem.external ? (
                          <a
                            key={`${item.label}-${subItem.label}`}
                            href={subItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleMobileLink}
                            className="block rounded-xl px-3 py-3 text-[14px] font-medium text-[#333333] transition-colors hover:bg-black/[0.04]"
                          >
                            {subItem.label}
                          </a>
                        ) : (
                          <Link
                            key={`${item.label}-${subItem.label}`}
                            href={subItem.href}
                            onClick={(event) => {
                              if (subItem.href.startsWith("#")) {
                                handleSectionLink(event, subItem.href);
                              } else {
                                handleMobileLink();
                              }
                            }}
                            className="block rounded-xl px-3 py-3 text-[14px] font-medium text-[#333333] transition-colors hover:bg-black/[0.04]"
                          >
                            {subItem.label}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                onClick={handleMobileLink}
                className="flex h-12 items-center justify-center rounded-full border border-black/20 text-[14px] font-semibold text-[#111111]"
              >
                Log in
              </Link>

              <Link
                href="/login"
                onClick={handleMobileLink}
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