import { Mail, Phone } from "lucide-react";

const footerColumns = [
  { title: "SERVICES", links: ["Standards", "Training", "Pest Management"] },
  { title: "SUPPORT", links: ["Privacy Policy", "Contact Support", "CU Academy"] }
];

export function Footer() {
  return (
    <footer className="bg-primary-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr] lg:px-10">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden="true">🌱</span>
            <span>TIC Kenya</span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
            Providing essential inspection, testing, and certification services to Kenya's agricultural sector for over three decades.
          </p>
          <div className="mt-7 flex gap-3">
            <a
              href="mailto:info@tickenya.example"
              aria-label="Email TIC Kenya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-200 transition hover:border-primary-green hover:text-white"
            >
              <Mail aria-hidden="true" className="h-4 w-4" />
            </a>
            <a
              href="tel:+254700000000"
              aria-label="Call TIC Kenya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-200 transition hover:border-primary-green hover:text-white"
            >
              <Phone aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-bold tracking-[0.16em] text-white">{column.title}</h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#services" className="text-sm text-slate-300 transition hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-6 text-center text-xs text-slate-400">
        © 2024 TIC Kenya. Grounded Precision in Certification.
      </div>
    </footer>
  );
}
