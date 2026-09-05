import { prisma } from "@/lib/db";
import { fail, handler, ok, parseQuery, validationFailed } from "@/lib/api";
import { requireBranch } from "@/lib/auth";
import { calculateRelievingDate, dateOnlyString } from "@/lib/domain";
import { relievingDateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/** Live preview for the enrolment form: admission date + course duration. */
export const GET = handler(async (request) => {
  await requireBranch();

  const parsed = parseQuery(request, relievingDateSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const course = await prisma.course.findUnique({
    where: { courseId: BigInt(parsed.data.course_id) },
    select: { courseDuration: true },
  });

  if (!course) return fail("Course not found.", 404);

  return ok("Relieving date calculated.", {
    relieving_date: dateOnlyString(
      calculateRelievingDate(parsed.data.admission_date, course.courseDuration),
    ),
    course_duration: course.courseDuration,
  });
});
