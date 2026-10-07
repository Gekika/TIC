import { Award, FlaskConical, ShieldCheck } from "lucide-react";
import { ServiceCard } from "../ui/ServiceCard";

const services = [
  {
    title: "Commodity Inspection",
    description:
      "Full-scale quantity and quality determination for bulk agricultural exports including tea, coffee, and horticulture.",
    linkText: "Learn More →",
    icon: ShieldCheck
  },
  {
    title: "Lab Services",
    description:
      "ISO-accredited testing for chemical residues, soil health, and seed purity at our Nairobi regional laboratories.",
    linkText: "View Accreditations →",
    icon: FlaskConical
  },
  {
    title: "Certification Programs",
    description:
      "GlobalGAP, Organic, and Fairtrade certification audits tailored for Kenyan cooperative structures.",
    linkText: "Process Overview →",
    icon: Award
  }
];

export function ServicesSection() {
  return (
    <section id="services" className="bg-card-bg py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary-green">— INSPECTION MODULE V.1</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-normal text-primary-dark sm:text-4xl">
          Advanced Supply Chain Integrity
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {services.map((service, index) => (
            <ServiceCard key={service.title} href="#portal" index={index} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
}
