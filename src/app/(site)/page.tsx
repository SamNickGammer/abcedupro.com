import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { SITE, CERTIFIED_BY } from "@/lib/site-config";
import { Reveal, CountUp } from "@/components/site/Reveal";
import { SectionHeader } from "@/components/site/SectionHeader";
import { ArrowRight } from "@/components/site/icons";

export const revalidate = 300;

/**
 * The featured courses came from a client-side fetch in the Laravel build,
 * which meant an empty grid until JavaScript ran. Reading them on the server
 * puts them in the HTML.
 */
async function featuredCourses() {
  try {
    const courses = await prisma.course.findMany({
      where: { courseStatus: "active" },
      orderBy: { courseDuration: "desc" },
      select: { courseName: true, shortForm: true, courseDuration: true },
    });

    // ADCA and DCA lead if they exist, as they did before.
    const preferred = ["ADCA", "DCA"];
    const lead = preferred
      .map((code) => courses.find((course) => course.shortForm.toUpperCase() === code))
      .filter(Boolean) as typeof courses;

    const rest = courses.filter((course) => !lead.includes(course));

    return [...lead, ...rest].slice(0, 4);
  } catch {
    // The marketing page must render even if the database is unreachable.
    return [];
  }
}

const COURSE_IMAGES = [
  "/assets/images/home/background1.png",
  "/assets/images/home/background1.png",
  "/assets/images/home/background1.png",
  "/assets/images/home/background1.png",
];

const ADVANTAGES = [
  {
    title: "Government Certified",
    body: "Recognized by the Bihar Government and ISO 9001:2015 certified. Your certificate is valid nationwide.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    title: "Expert Faculty",
    body: "Learn from industry professionals with years of practical experience in computer science.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
  },
  {
    title: "Hands-on Training",
    body: "Practical lab sessions on modern computers. Real projects and real skills from day one.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
  },
  {
    title: "Placement Support",
    body: "Career guidance, resume building and placement assistance to help you land your first job.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
  },
];

const TESTIMONIALS = [
  {
    name: "Om Prakash Bharati",
    role: "SDE @ BITCS",
    rating: 5,
    quote:
      "Institute of ABC gave me the foundation I needed to start my career in technology. The practical training was exceptional.",
  },
  {
    name: "Rahul Kumar",
    role: "Web Developer",
    rating: 5,
    quote:
      "The faculty here truly cares about student success. I learned more in six months than I expected. Highly recommended.",
  },
  {
    name: "Priya Singh",
    role: "Data Entry Operator",
    rating: 4,
    quote:
      "Great institute with modern facilities. The ADCA course helped me get placed within a month of completion.",
  },
  {
    name: "Amit Verma",
    role: "Tally Operator",
    rating: 5,
    quote:
      "Best computer institute in Bihar. The Tally and accounting course was very well structured and practical.",
  },
  {
    name: "Sneha Kumari",
    role: "Office Assistant",
    rating: 4,
    quote:
      "Learned MS Office, typing and basic programming. The teachers are supportive and patient with students.",
  },
  {
    name: "Vikash Yadav",
    role: "Freelancer",
    rating: 5,
    quote:
      "After completing my DCA I started freelancing in web design. ABC made this possible with their practical approach.",
  },
];

export default async function HomePage() {
  const courses = await featuredCourses();

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a]">
        <Image
          src="/assets/images/home/background1.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.9) 100%)",
          }}
        />

        <div className="relative z-10 max-w-3xl px-6 pb-32 pt-24 text-center text-white">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4.5 py-1.5 text-[13px] backdrop-blur-sm">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-green-500" />
            {SITE.iso}
          </span>

          <h1 className="mb-5 text-[clamp(36px,6vw,68px)] font-bold leading-[1.08] tracking-tight text-balance">
            Build a career in{" "}
            <span className="bg-gradient-to-br from-white via-white to-blue-400 bg-clip-text text-transparent">
              computer education
            </span>
          </h1>

          <p className="mx-auto mb-9 max-w-xl text-[clamp(15px,2vw,18px)] leading-relaxed text-white/70">
            Government-recognised diplomas, hands-on lab training and placement support — from
            Bihar&apos;s trusted institute since {SITE.foundedYear}.
          </p>

          <div className="flex flex-wrap justify-center gap-3.5">
            <Link
              href="/course"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-[0_8px_24px_rgba(255,255,255,0.15)]"
            >
              Explore Courses
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/student_info"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-8 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Verify a Certificate
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center">
          <div className="flex gap-8 rounded-t-[20px] border border-b-0 border-white/10 bg-white/[0.06] px-6 py-5 backdrop-blur-md sm:gap-12 sm:px-12">
            {[
              { value: 500, label: "Students" },
              { value: 10, label: "Courses" },
              { value: 5, label: "Branches" },
              { value: 8, label: "Years" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white sm:text-[28px]">
                  <CountUp to={stat.value} />
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-white/50 sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- certified */}
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
                className="h-[70px] w-auto object-contain opacity-60 grayscale transition duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------- courses */}
      <section id="courses" className="bg-neutral-50 px-6 py-20">
        <Reveal>
          <SectionHeader label="What We Offer" title="Our Courses" />
        </Reveal>

        {courses.length === 0 ? (
          <p className="text-center text-sm text-neutral-400">
            Course listings are being updated. Please check back shortly.
          </p>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course, index) => (
              <Reveal key={course.shortForm} delay={index * 80}>
                <Link
                  href="/course"
                  className="group block h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white transition duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
                >
                  <Image
                    src={COURSE_IMAGES[index % COURSE_IMAGES.length]}
                    alt=""
                    width={500}
                    height={340}
                    className="h-[170px] w-full object-cover"
                  />
                  <div className="p-5">
                    <h3 className="mb-1 text-lg font-bold text-neutral-900">{course.shortForm}</h3>
                    <p className="mb-3.5 text-[13px] leading-relaxed text-neutral-500">
                      {course.courseName} · {course.courseDuration} month
                      {course.courseDuration > 1 ? "s" : ""}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 transition-all group-hover:gap-2.5">
                      Learn more
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- advantages */}
      <section className="bg-white px-6 py-20">
        <Reveal>
          <SectionHeader label="Our Advantage" title="Why Choose Us" />
        </Reveal>
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ADVANTAGES.map((item, index) => (
            <Reveal key={item.title} delay={index * 80}>
              <div className="group h-full rounded-2xl border border-neutral-200 p-7 transition duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 transition group-hover:bg-ink">
                  <svg
                    className="h-6 w-6 stroke-neutral-700 transition group-hover:stroke-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    {item.icon}
                  </svg>
                </div>
                <h3 className="mb-2 text-base font-bold text-neutral-900">{item.title}</h3>
                <p className="text-[13px] leading-relaxed text-neutral-500">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ testimonials */}
      <section className="overflow-hidden bg-neutral-50 px-6 py-20">
        <Reveal>
          <SectionHeader label="Student Stories" title="What Our Students Say" />
        </Reveal>

        <div
          className="relative"
          style={{
            maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          }}
        >
          <div className="flex w-max gap-5 animate-marquee hover:[animation-play-state:paused]">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, index) => (
              <figure
                key={`${item.name}-${index}`}
                className="flex w-[330px] shrink-0 flex-col rounded-2xl border border-neutral-200 bg-white p-6"
              >
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }, (_, star) => (
                    <svg
                      key={star}
                      className="h-4 w-4"
                      fill={star < item.rating ? "#facc15" : "#e5e7eb"}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-neutral-600">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-4">
                  <Image
                    src="/assets/images/default_avatar.jpg"
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- cta */}
      <section className="relative overflow-hidden bg-[#0a0a0a] px-6 py-24 text-center text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(96,165,250,0.10) 0%, transparent 70%)",
          }}
        />
        <Reveal className="relative">
          <h2 className="text-[clamp(28px,4.5vw,44px)] font-bold leading-tight tracking-tight text-balance">
            Ready to start your
            <br />
            computer journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
            Join thousands of students who have changed their careers through quality computer
            education at {SITE.name}.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-neutral-100"
          >
            Get started today
            <ArrowRight className="h-[18px] w-[18px]" />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
