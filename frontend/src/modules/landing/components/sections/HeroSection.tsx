import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ButtonLink } from "../ui/button";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-primary-dark text-white">
      <div className="absolute inset-0 -z-10 opacity-35" aria-hidden="true">
        <svg className="h-full w-full" viewBox="0 0 1440 760" preserveAspectRatio="none">
          <defs>
            <linearGradient id="heroField" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0A1628" />
              <stop offset="58%" stopColor="#123426" />
              <stop offset="100%" stopColor="#1F6B4E" />
            </linearGradient>
          </defs>
          <rect width="1440" height="760" fill="url(#heroField)" />
          {Array.from({ length: 14 }).map((_, index) => (
            <path
              key={index}
              d={`M${-120 + index * 118} 760 C ${100 + index * 72} 575, ${270 + index * 64} 462, ${420 + index * 86} 312`}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.08"
              strokeWidth="2"
            />
          ))}
          <path d="M0 610 C230 525 380 655 610 560 C835 468 970 535 1440 414 V760 H0 Z" fill="#1F6B4E" opacity="0.3" />
        </svg>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-dark via-primary-dark/95 to-primary-dark/70" aria-hidden="true" />

      <div className="mx-auto flex min-h-[640px] max-w-7xl items-center px-5 py-20 sm:px-8 lg:min-h-[720px] lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <h1 className="text-5xl font-bold leading-tight tracking-normal text-white sm:text-6xl lg:text-7xl">
            Elevating Kenyan Agriculture
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-text-muted sm:text-lg">
            Integrated solutions for Training, Inspection, and Certification. Providing the proof to your promise through grounded precision.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <ButtonLink to="#services" variant="outline" size="lg" className="w-full sm:w-auto">
              Explore Services <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink to="#reach" variant="ghost" size="lg" className="w-full sm:w-auto">
              About TIC Kenya
            </ButtonLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
