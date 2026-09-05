import { prisma } from "@/lib/db";
import { fail, handler, ok, type RouteContext } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export const DELETE = handler(async (_request, context: RouteContext) => {
  await requireAdmin();

  const { id } = await context.params;
  const courseId = BigInt(id);

  const course = await prisma.course.findUnique({
    where: { courseId },
    select: { courseName: true, _count: { select: { students: true } } },
  });

  if (!course) return fail("Course not found.", 404);

  // The legacy schema cascaded this delete straight through to `student`, so
  // removing a course silently destroyed every student enrolled on it.
  if (course._count.students > 0) {
    return fail(
      `Cannot delete "${course.courseName}" — ${course._count.students} student(s) are enrolled on it. Mark it inactive instead.`,
      409,
    );
  }

  await prisma.course.delete({ where: { courseId } });

  return ok("Course deleted successfully.");
});

/** Retiring a course without destroying its history. */
export const PATCH = handler(async (request, context: RouteContext) => {
  await requireAdmin();

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { course_status?: string };

  if (body.course_status !== "active" && body.course_status !== "inactive") {
    return fail("course_status must be either 'active' or 'inactive'.", 422);
  }

  const course = await prisma.course.update({
    where: { courseId: BigInt(id) },
    data: { courseStatus: body.course_status },
  });

  return ok("Course status updated successfully.", {
    course_id: Number(course.courseId),
    course_status: course.courseStatus,
  });
});
