import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../ui/button";

const navItems = [
  { label: "Services", href: "#services" },
  { label: "Portal", href: "#portal" },
  { label: "Reach", href: "#reach" }
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-primary-dark/90 text-white backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="Main navigation">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold tracking-tight sm:text-base">
          <span aria-hidden="true">🌱</span>
          <span>TIC Kenya Portal</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-slate-300 transition hover:text-white">
              {item.label}
            </a>
          ))}
          <ButtonLink to="/login" size="sm" aria-label="Client Access">
            Client Access
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 md:hidden"
          aria-controls="mobile-menu"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </nav>

      {isOpen ? (
        <div id="mobile-menu" className="border-t border-white/10 bg-primary-dark px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-slate-200"
              >
                {item.label}
              </a>
            ))}
            <ButtonLink to="/login" size="sm" className="w-full" aria-label="Client Access">
              Client Access
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}
