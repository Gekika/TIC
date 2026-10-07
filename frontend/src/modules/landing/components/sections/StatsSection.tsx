import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "../ui/button";
import { StatItem } from "../ui/StatItem";

function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1200, bounce: 0 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => setValue(Math.round(latest)));
    return unsubscribe;
  }, [springValue]);

  useEffect(() => {
    if (inView) {
      motionValue.set(target);
    }
  }, [inView, motionValue, target]);

  return <span ref={ref}>{value}</span>;
}

export function StatsSection() {
  return (
    <section id="reach" className="bg-card-bg py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="map-grid relative min-h-[330px] overflow-hidden rounded-lg border border-divider bg-slate-200 shadow-soft-card sm:min-h-[430px]"
          aria-label="Regional coverage map placeholder"
          role="img"
        >
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 620 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M311 52 C371 76 406 128 438 184 C477 253 471 314 431 365 C390 418 323 431 254 401 C183 370 143 311 154 242 C166 167 237 86 311 52Z" fill="#FFFFFF" opacity="0.42" />
            <path d="M257 164 L335 126 L398 190 L365 292 L282 324 L214 261 Z" fill="none" stroke="#1F4E5F" strokeOpacity="0.35" strokeWidth="3" />
            <circle cx="335" cy="126" r="8" fill="#1F6B4E" />
            <circle cx="398" cy="190" r="8" fill="#1F6B4E" />
            <circle cx="282" cy="324" r="8" fill="#1F6B4E" />
            <circle cx="214" cy="261" r="8" fill="#1F6B4E" />
            <text x="310" y="238" textAnchor="middle" fill="#0A1628" opacity="0.55" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700">
              KE
            </text>
          </svg>
        </motion.div>

        <div>
          <p className="text-sm font-semibold text-primary-green">
            <CountUp target={274} />+ Global offices & laboratories
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-normal text-primary-dark sm:text-4xl">
            Global Reach, Local Expertise
          </h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
            TIC Kenya operates as the regional hub for certification excellence. With boots on the ground in every major agricultural zone, we bridge the gap between smallholder farms and international markets.
          </p>
          <ul className="mt-7 space-y-4">
            <StatItem>274+ Global offices & laboratories</StatItem>
            <StatItem>Accredited by major international standards</StatItem>
            <StatItem>Real-time digital inspection tracking</StatItem>
          </ul>
          <ButtonLink to="#footer" className="mt-9" aria-label="Contact Nairobi Office">
            Contact Nairobi Office
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
