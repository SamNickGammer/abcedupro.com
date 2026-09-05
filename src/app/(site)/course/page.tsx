import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseSubjects } from "@/lib/domain";
import { SITE } from "@/lib/site-config";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeader } from "@/components/site/SectionHeader";
import { ArrowRight, CheckCircle } from "@/components/site/icons";
import { PageHero } from "@/components/site/PageHero";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Government-recognised computer courses at Institute of ABC — diplomas, certificates and specialist programmes with practical lab training.",
};

export default async function CoursePage() {
  const courses = await prisma.course
    .findMany({
      where: { courseStatus: "active" },
      orderBy: [{ courseDuration: "desc" }, { courseName: "asc" }],
      select: {
        courseId: true,
        courseName: true,
        shortForm: true,
        courseDuration: true,
        courseFees: true,
        subjects: true,
      },
    })
    .catch(() => []);

  return (
    <>
      <PageHero
        eyebrow="What we offer"
        title="Our Courses"
        description="Every programme ends in a certificate you can verify online, backed by practical lab hours rather than theory alone."
      />

      <section className="bg-neutral-50 px-6 py-16">
        {courses.length === 0 ? (
          <p className="text-center text-sm text-neutral-500">
            Course listings are being updated. Please check back shortly.
          </p>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => {
              const subjects = parseSubjects(course.subjects);

              return (
                <Reveal key={String(course.courseId)} delay={(index % 3) * 80}>
                  <article className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-neutral-900">
                          {course.shortForm}
                        </h3>
                        <p className="mt-0.5 text-sm text-neutral-500">{course.courseName}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                        {course.courseDuration} mo
                      </span>
                    </div>

                    {subjects.length > 0 ? (
                      <ul className="mb-5 flex-1 space-y-1.5">
                        {subjects.map((subject) => (
                          <li
                            key={subject}
                            className="flex items-start gap-2 text-[13px] text-neutral-600"
                          >
                            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            {subject}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex-1" />
                    )}

                    <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                      <p className="text-sm">
                        <span className="font-bold text-neutral-900">
                          ₹{Number(course.courseFees).toLocaleString("en-IN")}
                        </span>
                        <span className="text-neutral-400"> total</span>
                      </p>
                      <Link
                        href="/contact"
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 transition-all hover:gap-2.5"
                      >
                        Enquire
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white px-6 py-20">
        <Reveal>
          <SectionHeader label="How it works" title="From enrolment to certificate" />
        </Reveal>
        <ol className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", title: "Enrol at a centre", body: "Visit your nearest study centre with an ID and a photograph." },
            { step: "02", title: "Attend & practise", body: "Classroom teaching plus supervised lab hours for the course duration." },
            { step: "03", title: "Sit the assessment", body: "Written, practical, project and viva components, each scored out of 100." },
            { step: "04", title: "Receive your certificate", body: "Head office verifies the marksheet and issues a certificate you can verify online." },
          ].map((item, index) => (
            <Reveal key={item.step} delay={index * 80}>
              <li className="h-full rounded-2xl border border-neutral-200 p-6">
                <span className="text-xs font-bold tracking-[0.14em] text-neutral-400">
                  {item.step}
                </span>
                <h3 className="mt-2 text-base font-bold text-neutral-900">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{item.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>

        <div className="mt-12 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Talk to {SITE.name}
            <ArrowRight className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </section>
    </>
  );
}
