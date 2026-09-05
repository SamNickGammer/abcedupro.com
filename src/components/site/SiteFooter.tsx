import Image from "next/image";
import Link from "next/link";
import { NAV_LEFT, NAV_RIGHT, SITE, SOCIALS } from "@/lib/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-[#0a0a0a] px-6 pt-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Image
            src="/assets/images/logo/abc_logo.svg"
            alt={SITE.name}
            width={160}
            height={48}
            className="h-12 w-auto brightness-0 invert"
          />
          <p className="mt-3 mb-5 max-w-xs text-sm leading-7 text-white/50">{SITE.blurb}</p>
          <div className="flex gap-2.5">
            {SOCIALS.map((social) => (
              <a
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06] transition hover:bg-white/15"
              >
                <Image src={social.icon} alt="" width={15} height={15} className="brightness-0 invert" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/40">
            Quick Links
          </h3>
          {[...NAV_LEFT, ...NAV_RIGHT].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block py-1.5 text-sm text-white/65 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div>
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/40">
            Portals
          </h3>
          <Link href="/student_info" className="block py-1.5 text-sm text-white/65 transition hover:text-white">
            Verify a Certificate
          </Link>
          <Link href="/branch/login" className="block py-1.5 text-sm text-white/65 transition hover:text-white">
            Branch Login
          </Link>
          <Link href="/admin-abc/login" className="block py-1.5 text-sm text-white/65 transition hover:text-white">
            Admin Login
          </Link>
        </div>

        <div>
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/40">
            Get in Touch
          </h3>
          <a href={SITE.phoneHref} className="mb-3 flex gap-2.5 text-sm text-white/65 transition hover:text-white">
            <Image src="/assets/icons/phone-small.svg" alt="" width={14} height={14} className="mt-1 shrink-0 brightness-0 invert opacity-60" />
            {SITE.phone}
          </a>
          <a href={SITE.emailHref} className="mb-3 flex gap-2.5 text-sm text-white/65 transition hover:text-white">
            <Image src="/assets/icons/mail.svg" alt="" width={14} height={14} className="mt-1 shrink-0 brightness-0 invert opacity-60" />
            {SITE.email}
          </a>
          <p className="flex gap-2.5 text-sm leading-6 text-white/65">
            <Image src="/assets/icons/globe.svg" alt="" width={14} height={14} className="mt-1 shrink-0 brightness-0 invert opacity-60" />
            <span>
              Haspura, Aurangabad
              <br />
              Bihar 824120
            </span>
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] py-5">
        <p className="text-[13px] text-white/35">
          © {year} {SITE.name}. {SITE.societyReg}
        </p>
        <p className="text-[13px] text-white/35">{SITE.iso}</p>
      </div>
    </footer>
  );
}
