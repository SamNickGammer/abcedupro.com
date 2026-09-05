import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { parseSubjects } from "@/lib/domain";

export const runtime = "nodejs";
export const revalidate = 300;

/**
 * The course catalogue for the marketing site. Genuinely public — it is printed
 * on the prospectus — and deliberately narrower than the authenticated
 * `/api/courses`: no ids, no timestamps, active courses only.
 */
export const GET = handler(async () => {
  const courses = await prisma.course.findMany({
    where: { courseStatus: "active" },
    orderBy: [{ courseDuration: "desc" }, { courseName: "asc" }],
    select: {
      courseName: true,
      shortForm: true,
      courseDuration: true,
      courseFees: true,
      subjects: true,
    },
  });

  return ok(
    "Courses retrieved successfully.",
    courses.map((course) => ({
      course_name: course.courseName,
      short_form: course.shortForm,
      course_duration: course.courseDuration,
      course_fees: Number(course.courseFees),
      subjects: parseSubjects(course.subjects),
    })),
  );
});
