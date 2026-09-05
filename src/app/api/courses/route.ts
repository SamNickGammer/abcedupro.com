import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, parseQuery, validationFailed } from "@/lib/api";
import { requireAdmin, requireBranch } from "@/lib/auth";
import { createCourseSchema, listCoursesSchema } from "@/lib/validation/schemas";
import { parseSubjects } from "@/lib/domain";

export const runtime = "nodejs";

const DEFAULT_SUBJECTS = "Written Marks, Practical Marks, Project Marks, Viva Marks";

/**
 * Readable by any signed-in branch — enrolment forms need the catalogue.
 * The legacy version was unauthenticated, which is how the live API leaked
 * data to an anonymous request during the audit.
 */
export const GET = handler(async (request) => {
  await requireBranch();

  const parsed = parseQuery(request, listCoursesSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const courses = await prisma.course.findMany({
    where: parsed.data.showActiveOnly ? { courseStatus: "active" } : undefined,
    orderBy: { courseName: "asc" },
  });

  return ok(
    "Courses retrieved successfully.",
    courses.map((course) => ({
      course_id: Number(course.courseId),
      course_name: course.courseName,
      short_form: course.shortForm,
      course_duration: course.courseDuration,
      course_fees: Number(course.courseFees),
      course_status: course.courseStatus,
      subjects: course.subjects,
      subject_list: parseSubjects(course.subjects),
      created_at: course.createdAt,
      updated_at: course.updatedAt,
    })),
  );
});

export const POST = handler(async (request) => {
  await requireAdmin();

  const parsed = await parseBody(request, createCourseSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const data = parsed.data;

  try {
    const course = await prisma.course.create({
      data: {
        courseName: data.course_name,
        shortForm: data.short_form,
        courseDuration: data.course_duration,
        courseFees: new Prisma.Decimal(data.course_fees),
        courseStatus: "active",
        subjects: data.subjects ?? DEFAULT_SUBJECTS,
      },
    });

    return ok("Course added successfully.", { course_id: Number(course.courseId) }, undefined, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("A course with that name or short form already exists.", 409);
    }
    throw error;
  }
});
