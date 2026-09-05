import { z } from "zod";
import {
  boolish,
  dateString,
  fileOrNull,
  idParam,
  jsonObject,
  numberArray,
  optionalDateString,
  optionalText,
  pagination,
  requiredText,
  stringArray,
} from "@/lib/validation/common";

// -------------------------------------------------------------------- auth

export const loginSchema = z.object({
  branchCode: requiredText(50, "Branch code"),
  password: z.string().min(6, "Password must be at least 6 characters."),
  portal: z.enum(["branch", "superadmin"]).nullish(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6, "New password must be at least 6 characters."),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

export const updateAdminCredentialsSchema = z
  .object({
    username: requiredText(50, "Username"),
    current_password: z.string().min(6),
    new_password: z.string().min(6).nullish().or(z.literal("").transform(() => null)),
    new_password_confirmation: z
      .string()
      .nullish()
      .or(z.literal("").transform(() => null)),
  })
  .refine(
    (value) => !value.new_password || value.new_password !== value.current_password,
    { message: "New password must differ from the current one.", path: ["new_password"] },
  )
  .refine(
    (value) => !value.new_password || value.new_password === value.new_password_confirmation,
    { message: "Password confirmation does not match.", path: ["new_password_confirmation"] },
  );

// ------------------------------------------------------------------ branch

export const createBranchSchema = z.object({
  phone: requiredText(15, "Phone"),
  email_id: z.string().trim().email("Must be a valid email address.").max(255),
  branch_code: requiredText(50, "Branch code"),
  branch_name: requiredText(255, "Branch name"),
  address_line1: requiredText(255, "Address line 1"),
  address_line2: optionalText(255),
  city: requiredText(100, "City"),
  state: requiredText(100, "State"),
  zip: z.coerce.number().int(),
  first_name: requiredText(100, "First name"),
  last_name: optionalText(100),
  credit: z.coerce.number().int().min(0).default(0),
  credit_per_certificate: z.coerce.number().int().min(0).default(200),
  initial_password: z.string().min(6).nullish().or(z.literal("").transform(() => null)),
  manager_photo: fileOrNull,
});

export const updateBranchSchema = z.object({
  first_name: optionalText(100),
  last_name: optionalText(100),
  address_line1: optionalText(255),
  address_line2: optionalText(255),
  city: optionalText(100),
  state: optionalText(100),
  zip: z.coerce.number().int().nullish(),
  phone: optionalText(15),
  email_id: z.string().trim().email().max(255).nullish().or(z.literal("").transform(() => null)),
  credit_per_certificate: z.coerce.number().int().min(0).nullish(),
  manager_photo: fileOrNull,
});

export const branchStatusSchema = z.object({ active: boolish });

export const setBranchPasswordSchema = z.object({
  new_password: z.string().min(6, "Password must be at least 6 characters."),
});

export const addCreditSchema = z.object({
  credit_to_add: z.coerce.number().min(0),
});

export const listBranchesSchema = z.object({
  showActiveOnly: boolish.nullish(),
});

// ------------------------------------------------------------------ course

export const createCourseSchema = z.object({
  course_name: requiredText(255, "Course name"),
  short_form: requiredText(10, "Short form"),
  course_duration: z.coerce.number().int().min(1).max(50),
  course_fees: z.coerce.number().min(0),
  subjects: optionalText(500),
});

export const listCoursesSchema = z.object({
  showActiveOnly: boolish.nullish(),
});

// ----------------------------------------------------------------- student

export const STUDENT_STATUS_FILTERS = [
  "all",
  "no_cert",
  "pending",
  "verified",
  "certified",
  "active",
  "inactive",
] as const;

export const listStudentsSchema = pagination.extend({
  search: optionalText(255),
  status: z.enum(STUDENT_STATUS_FILTERS).default("all"),
  list_type: z.enum(["all", "certificate_pending"]).default("all"),
  /** Admin only — narrows an all-branch listing to a single branch. */
  branch_id: z.coerce.number().int().positive().nullish(),
  /** `false` returns every match unpaginated, as the old branch listing did. */
  paginate: boolish.default(true),
});

export const createStudentSchema = z.object({
  student_name: requiredText(255, "Student name"),
  registration_number: requiredText(100, "Registration number"),
  student_email: z
    .string()
    .trim()
    .email()
    .max(255)
    .nullish()
    .or(z.literal("").transform(() => null)),
  student_phone: z.string().trim().regex(/^\d{10}$/, "Phone must be exactly 10 digits."),
  student_father_name: optionalText(255),
  student_mother_name: optionalText(255),
  student_course_id: idParam,
  dob: dateString,
  address: optionalText(500),
  city: optionalText(255),
  state: optionalText(255),
  zip: optionalText(10),
  admission_date: dateString,
  relieving_date: optionalDateString,
  aadhaar_number: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Aadhaar must be 12 digits."),
  student_photo: fileOrNull,
});

export const updateStudentSchema = z.object({
  student_name: optionalText(255),
  student_email: z
    .string()
    .trim()
    .email()
    .max(255)
    .nullish()
    .or(z.literal("").transform(() => null)),
  student_phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone must be exactly 10 digits.")
    .nullish()
    .or(z.literal("").transform(() => null)),
  student_father_name: optionalText(255),
  student_mother_name: optionalText(255),
  student_course_id: idParam.nullish(),
  dob: optionalDateString,
  address: optionalText(500),
  city: optionalText(255),
  state: optionalText(255),
  zip: optionalText(10),
  admission_date: optionalDateString,
  relieving_date: optionalDateString,
  total_fees: z.coerce.number().min(0).nullish(),
  paid_fees: z.coerce.number().min(0).nullish(),
  due_fees: z.coerce.number().min(0).nullish(),
  is_student_active: boolish.nullish(),
  student_photo: fileOrNull,
});

export const marksheetSchema = z.object({
  marks: jsonObject,
});

export const certificationSchema = z.object({
  certified_date: dateString,
  marksheet_id: optionalText(50),
});

export const secureCertificationSchema = z.object({
  password: z.string().min(6),
  certified_date: optionalDateString,
  marks: jsonObject.nullish(),
  marksheet_id: optionalText(50),
});

export const aadhaarSchema = z.object({
  aadhaar_number: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Aadhaar must be 12 digits."),
});

export const relievingDateSchema = z.object({
  admission_date: dateString,
  course_id: idParam,
});

export const publicStudentLookupSchema = z.object({
  registration_number: requiredText(100, "Registration number"),
  dob: dateString,
});

// ----------------------------------------------------------------- library

export const libraryYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export const libraryMonthSchema = libraryYearSchema.extend({
  month: z.coerce.number().int().min(1).max(12),
  search: optionalText(255),
});

export const libraryAvailabilitySchema = libraryYearSchema.extend({
  months: numberArray.refine(
    (list) => list.length > 0 && list.every((m) => m >= 1 && m <= 12),
    "Months must be between 1 and 12.",
  ),
  slots: stringArray.refine((list) => list.length > 0, "At least one slot is required."),
  exclude_booking_id: idParam.nullish(),
});

export const libraryAdmitSchema = libraryYearSchema.extend({
  name: requiredText(255, "Name"),
  phone: optionalText(20),
  note: optionalText(1000),
  months: numberArray.refine(
    (list) => list.length > 0 && list.every((m) => m >= 1 && m <= 12),
    "Months must be between 1 and 12.",
  ),
  status: z.enum(["confirmed", "secured"]),
  block: requiredText(20, "Block"),
  seat_id: requiredText(100, "Seat"),
  slots: stringArray.refine((list) => list.length > 0, "At least one slot is required."),
  lockers: numberArray.default([]),
  custom_price: z.coerce.number().min(0).nullish(),
  payment_status: z.enum(["pending", "paid"]).default("pending"),
  payment_method: optionalText(50),
  payment_collected_by: optionalText(255),
  payment_note: optionalText(1000),
});

export const libraryPriceSchema = z.object({
  monthly_price: z.coerce.number().min(0),
});

export const libraryPaymentSchema = z.object({
  payment_method: requiredText(50, "Payment method"),
  payment_collected_by: requiredText(255, "Collected by"),
  payment_note: optionalText(1000),
});

export const libraryExtendSchema = libraryYearSchema.extend({
  months: numberArray.refine(
    (list) => list.length > 0 && list.every((m) => m >= 1 && m <= 12),
    "Months must be between 1 and 12.",
  ),
});

export const libraryDeleteSchema = z.object({
  scope: z.enum(["month", "all"]),
});

export const librarySlotDefinition = z.object({
  id: requiredText(20, "Slot id"),
  label: requiredText(50, "Slot label"),
  time: requiredText(50, "Slot time"),
  color: optionalText(20),
});

export const libraryConfigSchema = z.object({
  slot_definitions: z.array(librarySlotDefinition).min(1).nullish(),
  pricing_tiers: z.record(z.string(), z.coerce.number().min(0)).nullish(),
  locker_price: z.coerce.number().min(0).nullish(),
  locker_numbers: z.array(z.coerce.number().int().min(1)).min(1).nullish(),
  seat_layout: z
    .record(
      z.string(),
      z.array(
        z.object({
          row: z.string(),
          seats: z.array(z.coerce.number().int().min(0)),
        }),
      ),
    )
    .nullish(),
});
