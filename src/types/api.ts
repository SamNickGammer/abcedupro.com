/** Response shapes shared by the panel screens. */

export type StudentRow = {
  student_id: number;
  student_name: string;
  registration_number: string;
  student_email: string | null;
  student_phone: string;
  student_father_name: string | null;
  student_mother_name: string | null;
  branch_id: number;
  student_course_id: number;
  dob: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  admission_date: string;
  relieving_date: string;
  is_student_active: boolean;
  student_photo: string | null;
  student_photo_src: string | null;
  total_fees: number | null;
  paid_fees: number | null;
  due_fees: number | null;
  marksheet_id: string | null;
  marks: string | null;
  marks_parsed: Record<string, number>;
  marksheet_stage: "started" | "pending" | "verified";
  overall_percent: number | null;
  performance: string;
  certified_date: string | null;
  is_certificate_approve: boolean;
  aadhaar_number: string | null;
  created_at: string;
  updated_at: string;
  course_name: string;
  short_form: string;
  course_duration: number;
  course_fees: number;
  course_subjects: string[];
  branch_name: string;
  branch_code: string;
  branch_director_first: string;
  branch_director_last: string | null;
  branch_address: string;
  branch_city: string | null;
  branch_state: string | null;
  branch_zip: number | null;
  branch_phone: string | null;
  verification_url: string | null;
};

export type CourseRow = {
  course_id: number;
  course_name: string;
  short_form: string;
  course_duration: number;
  course_fees: number;
  course_status: "active" | "inactive";
  subjects: string;
  subject_list: string[];
};

export type BranchRow = {
  id: number;
  branchCode: string;
  branchName: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  emailId: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: number;
  image: string | null;
  /** Servable URL built from `image`; null until the bucket is reachable. */
  imageUrl: string | null;
  role: string;
  active: boolean;
  credit: number;
  creditPerCertificate: number;
  centerCreationDate: string;
  createdAt: string;
  updatedAt: string;
  totalStudents: number;
};

export type BranchDashboard = {
  stats: {
    total_students: number;
    pending_students: number;
    verified_students: number;
    certified_students: number;
    active_students: number;
    credit: number;
    credit_per_certificate: number;
    certificates_affordable: number;
  };
  branch: {
    branch_id: number;
    branch_code: string;
    branch_name: string;
    city: string;
    state: string;
  };
  recent_students: StudentRow[];
};

export type AdminDashboard = {
  stats: {
    total_students: number;
    pending_students: number;
    certified_students: number;
    total_branches: number;
    active_branches: number;
    total_courses: number;
  };
  recent_students: StudentRow[];
  branches: Array<{
    id: number;
    branch_code: string;
    branch_name: string;
    city: string;
    state: string;
    credit: number;
    credit_per_certificate: number;
    active: boolean;
    role: string;
    total_students: number;
  }>;
};
