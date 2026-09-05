import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Card } from "@/components/ui";
import { SITE } from "@/lib/site-config";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Institute of ABC — Haspura, Aurangabad, Bihar. Phone, email and centre addresses.",
};

const CONTACT_POINTS = [
  {
    icon: "/assets/icons/phone-small.svg",
    label: "Phone",
    value: SITE.phone,
    href: SITE.phoneHref,
  },
  {
    icon: "/assets/icons/mail.svg",
    label: "Email",
    value: SITE.email,
    href: SITE.emailHref,
  },
  {
    icon: "/assets/icons/globe.svg",
    label: "Registered office",
    value: "Haspura, Aurangabad, Bihar 824120",
  },
  {
    icon: "/assets/icons/globe.svg",
    label: "Corporate office",
    value: "Gaya Paharpur (Near 5 No. Gate)",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Contact Us"
        description="Questions about a course, an admission or a certificate? Reach us directly — we usually reply the same day."
      />

      <section className="bg-neutral-50 px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <div className="space-y-4">
              {CONTACT_POINTS.map((point) => (
                <Card key={point.label} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <Image src={point.icon} alt="" width={17} height={17} className="opacity-70" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      {point.label}
                    </p>
                    {point.href ? (
                      <a
                        href={point.href}
                        className="text-[15px] font-semibold text-neutral-900 underline-offset-2 hover:underline"
                      >
                        {point.value}
                      </a>
                    ) : (
                      <p className="text-[15px] font-semibold text-neutral-900">{point.value}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <Card>
              <h2 className="text-lg font-bold tracking-tight text-neutral-900">Send an enquiry</h2>
              <p className="mt-1 mb-5 text-sm text-neutral-500">
                Tell us what you&apos;d like to know and we&apos;ll get back to you.
              </p>
              <ContactForm />
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  );
}
