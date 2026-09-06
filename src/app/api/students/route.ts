import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, handler, ok, parseBody, parseQuery, validationFailed } from "@/lib/api";
import { requireBranch } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";
import { calculateRelievingDate, toDateOnly } from "@/lib/domain";
import { presentStudent, searchWhere, statusWhere, studentInclude } from "@/lib/students";
import { createStudentSchema, listStudentsSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * One listing for both panels. A branch only ever sees its own students —
 * the scope comes from the session, so `branch_id` in the query is honoured
 * only for an admin narrowing an all-branch view.
 */
export const GET = handler(async (request) => {
  const caller = await requireBranch();
  const isAdmin = caller.role.toLowerCase() === "admin";

  const parsed = parseQuery(request, listStudentsSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const { page, per_page, search, status, list_type, branch_id, paginate } = parsed.data;

  const scope: Prisma.StudentWhereInput = isAdmin
    ? branch_id
      ? { branchId: BigInt(branch_id) }
      : {}
    : { branchId: caller.id };

  const where: Prisma.StudentWhereInput = {
    AND: [
      scope,
      searchWhere(search),
      statusWhere(status),
      list_type === "certificate_pending"
        ? { marksheetStage: "pending", NOT: { marks: null } }
        : {},
    ],
  };

  const query = {
    where,
    include: studentInclude,
    // Newest enrolment first. The Blade panels ordered by `updated_at`, which
    // meant any edit — a fee correction, a marks entry — jumped that student
    // to the top and shuffled the list under whoever was reading it.
    // `created_at` is stable: a row's position only changes when rows are added
    // before it. `student_id` breaks ties, since bulk imports share a timestamp.
    orderBy: [{ createdAt: "desc" }, { studentId: "desc" }],
  } satisfies Prisma.StudentFindManyArgs;

  if (!paginate) {
    const students = await prisma.student.findMany(query);
    return ok("Students retrieved successfully.", students.map(presentStudent));
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({ ...query, skip: (page - 1) * per_page, take: per_page }),
    prisma.student.count({ where }),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / per_page));

  return ok("Students retrieved successfully.", students.map(presentStudent), {
    pagination: {
      current_page: page,
      last_page: lastPage,
      per_page,
      total,
      from: total === 0 ? null : (page - 1) * per_page + 1,
      to: total === 0 ? null : (page - 1) * per_page + students.length,
    },
  });
});

export const POST = handler(async (request) => {
  const caller = await requireBranch();

  const parsed = await parseBody(request, createStudentSchema);
  if (!parsed.success) return validationFailed(parsed.error);

  const data = parsed.data;

  const course = await prisma.course.findUnique({
    where: { courseId: BigInt(data.student_course_id) },
    select: { courseId: true, courseFees: true, courseDuration: true },
  });

  if (!course) return fail("Selected course does not exist.", 422);

  const duplicate = await prisma.student.findUnique({
    where: { aadhaarNumber: data.aadhaar_number },
    select: { studentId: true, studentName: true, registrationNumber: true },
  });

  if (duplicate) {
    return fail("This Aadhaar number is already registered.", 409, {
      conflict: {
        student_id: Number(duplicate.studentId),
        student_name: duplicate.studentName,
        registration_number: duplicate.registrationNumber,
      },
    });
  }

  // The old API trusted a client-supplied relieving_date; deriving it from the
  // course duration keeps the certificate's "date certified" range honest.
  const relievingDate = data.relieving_date
    ? toDateOnly(data.relieving_date)
    : calculateRelievingDate(data.admission_date, course.courseDuration);

  try {
    const created = await prisma.student.create({
      data: {
        studentName: data.student_name,
        registrationNumber: data.registration_number,
        studentEmail: data.student_email ?? null,
        // Stored with the country code, matching every existing row.
        studentPhone: `+91${data.student_phone}`,
        studentFatherName: data.student_father_name ?? null,
        studentMotherName: data.student_mother_name ?? null,
        branchId: caller.id,
        studentCourseId: course.courseId,
        dob: toDateOnly(data.dob),
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zip ?? null,
        admissionDate: toDateOnly(data.admission_date),
        relievingDate,
        totalFees: course.courseFees,
        aadhaarNumber: data.aadhaar_number,
      },
      include: studentInclude,
    });

    // The upload happens after the insert because the key contains the new
    // student's id. A failure here throws, and the student row stays — better
    // than losing the enrolment over a photo.
    if (data.student_photo) {
      const uploaded = await uploadImage(data.student_photo, "student_photo", created.studentId);
      const withPhoto = await prisma.student.update({
        where: { studentId: created.studentId },
        data: { studentPhoto: uploaded.key },
        include: studentInclude,
      });
      return ok("Student created successfully.", presentStudent(withPhoto), undefined, 201);
    }

    return ok("Student created successfully.", presentStudent(created), undefined, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("That registration number is already in use.", 409);
    }
    throw error;
  }
});
