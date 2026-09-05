import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeader } from "@/components/site/SectionHeader";
import { SITE, CERTIFIED_BY } from "@/lib/site-config";
import { CertificateTabs } from "@/components/site/CertificateTabs";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Institute of ABC — an ISO 9001:2015 certified computer training institute recognised by the Government of Bihar, serving students since 2016.",
};

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  return (
    <>
      <PageHero
        eyebrow="Who we are"
        title="About Institute of ABC"
        description={`${SITE.iso} · ${SITE.societyReg}`}
      />

      {/* Director's message */}
      <section id="director" className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[420px_1fr]">
          <Reveal>
            <Image
              src="/about_us.jpg"
              alt="Institute of ABC campus"
              width={840}
              height={620}
              className="w-full rounded-2xl object-cover shadow-[0_12px_40px_rgba(0,0,0,0.10)]"
            />
          </Reveal>

          <Reveal delay={100}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Director&apos;s message
            </p>
            <h2 className="text-[clamp(24px,3vw,34px)] font-bold leading-tight tracking-tight text-neutral-900">
              Education is the one investment nobody can take away from you.
            </h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-neutral-600">
              <p>
                We started {SITE.name} in {SITE.foundedYear} with a simple conviction: a student in
                a small town in Bihar deserves the same standard of computer training as a student
                anywhere else. Not a watered-down syllabus, not a certificate that means nothing
                outside the district — the real thing.
              </p>
              <p>
                That conviction shapes how we work. Every course ends in an assessment with written,
                practical, project and viva components. Every certificate is approved by head office
                before it is issued, and every one of them carries a link and a QR code so that any
                employer can check it in seconds.
              </p>
              <p>
                Our centres are run by people from the communities they serve. If you are thinking
                about enrolling, come and see a class before you decide.
              </p>
            </div>
            <p className="mt-6 border-l-2 border-neutral-900 pl-4">
              <span className="block font-bold text-neutral-900">{SITE.director}</span>
              <span className="block text-sm text-neutral-500">Director, {SITE.name}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Recognition */}
      <section className="bg-neutral-50 px-6 py-20">
        <Reveal>
          <SectionHeader label="Recognition" title="Accreditation & Certificates" />
        </Reveal>
        <CertificateTabs initialTab={tab === "govt" ? "govt" : "iso"} />
      </section>

      {/* Certified by */}
      <section className="bg-white px-6 py-18">
        <Reveal>
          <SectionHeader label="Trusted & Recognised" title="Certified By" />
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-10">
            {CERTIFIED_BY.map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={140}
                height={70}
                className="h-[70px] w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
