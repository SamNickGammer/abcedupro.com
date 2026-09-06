"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/use-api";
import type { AdminDashboard, StudentRow } from "@/types/api";
import { Skeleton } from "@/components/panel/sa/Spinner";

/**
 * Head-office dashboard — ported from
 * resources/views/superadmin/pages/dashboard.blade.php.
 *
 * The Blade page hid the whole screen behind one spinner until the request
 * finished, so a slow response looked like a blank page. Here the layout
 * renders immediately with shimmering placeholders in the shape of the real
 * content, and each region swaps in as its data lands.
 */

const STATS = [
  {
    key: "total_students",
    label: "Total Students",
    bg: "#eff6ff",
    fg: "#2563eb",
    value: "#111",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    key: "total_branches",
    label: "Branches",
    bg: "#f0fdf4",
    fg: "#16a34a",
    value: "#16a34a",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    key: "pending_students",
    label: "Pending Approval",
    bg: "#fef9c3",
    fg: "#ca8a04",
    value: "#ca8a04",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    key: "certified_students",
    label: "Certified",
    bg: "#eff6ff",
    fg: "#2563eb",
    value: "#2563eb",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    ),
  },
  {
    key: "total_courses",
    label: "Courses",
    bg: "#fef2f2",
    fg: "#dc2626",
    value: "#dc2626",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
  },
] as const;

const QUICK_ACTIONS = [
  {
    href: "/admin-abc/approvals",
    title: "Approvals",
    subtitle: "Pending certificates",
    bg: "#fef9c3",
    fg: "#ca8a04",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    href: "/admin-abc/students",
    title: "All Students",
    subtitle: "Across all branches",
    bg: "#eff6ff",
    fg: "#2563eb",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    href: "/admin-abc/branches",
    title: "Branches",
    subtitle: "Manage branches",
    bg: "#f0fdf4",
    fg: "#16a34a",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    href: "/admin-abc/courses",
    title: "Courses",
    subtitle: "Manage courses",
    bg: "#fef2f2",
    fg: "#dc2626",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
  },
] as const;

export function SaDashboard({ adminName }: { adminName: string }) {
  const { data, loading, error } = useApi<AdminDashboard>("/api/dashboard/admin");

  return (
    <div style={{ padding: "0 12px 40px" }}>
      {/* Hero */}
      <div className="sa-dash-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #111 0%, #1e1b4b 50%, #312e81 100%)",
            padding: "32px 36px",
            color: "#fff",
            position: "relative",
          }}
        >
          <div
            aria-hidden
            style={{ position: "absolute", top: 0, right: 0, width: 300, height: "100%", opacity: 0.06 }}
          >
            <svg viewBox="0 0 300 200" fill="white">
              <circle cx="200" cy="40" r="140" />
              <circle cx="250" cy="170" r="100" />
            </svg>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Admin Dashboard
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
              Welcome, {adminName}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: 0 }}>
              Manage all branches, students, and certifications from here.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="sa-dash-card"
          style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2" }}
        >
          <div className="sa-dash-card-inner">
            <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>
              Could not load the dashboard
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#dc2626" }}>{error}</p>
          </div>
        </div>
      ) : null}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {STATS.map((stat) => (
          <StatCard
            key={stat.key}
            stat={stat}
            loading={loading}
            value={data?.stats[stat.key] ?? 0}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {QUICK_ACTIONS.map((action) => (
          <QuickAction key={action.href} action={action} />
        ))}
      </div>

      {/* Recent students + branch overview */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        <div className="sa-dash-card">
          <div className="sa-dash-card-inner">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                Recent Students (All Branches)
              </h2>
              <Link
                href="/admin-abc/students"
                style={{ fontSize: 12, color: "#9ca3af", textDecoration: "none" }}
              >
                View all &rarr;
              </Link>
            </div>

            {loading ? (
              <RecentSkeleton />
            ) : (data?.recent_students.length ?? 0) === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
                <p style={{ fontSize: 13, margin: 0 }}>No students yet.</p>
              </div>
            ) : (
              <table className="sa-fade-in" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Student", "Branch", "Course", "Status"].map((heading) => (
                      <th key={heading} style={th}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data!.recent_students.slice(0, 8).map((student) => (
                    <RecentRow key={student.student_id} student={student} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="sa-dash-card">
          <div className="sa-dash-card-inner">
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 18px" }}>Branch Overview</h2>

            {loading ? (
              <BranchSkeleton />
            ) : (data?.branches.length ?? 0) === 0 ? (
              <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No branches found.
              </p>
            ) : (
              <div className="sa-fade-in">
                {data!.branches.map((branch) => (
                  <div
                    key={branch.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: branch.active ? "#16a34a" : "#dc2626",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{branch.branch_name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        {branch.branch_code} &middot; {branch.city}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                      {branch.credit.toLocaleString()} cr
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- pieces

const th: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#9ca3af",
  padding: "10px 16px",
  borderBottom: "1px solid #f3f4f6",
  textAlign: "left",
};

const td: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 13.5,
  borderBottom: "1px solid #f9fafb",
};

function StatCard({
  stat,
  value,
  loading,
}: {
  stat: (typeof STATS)[number];
  value: number;
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "22px 24px",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseOver={(event) => {
        event.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseOut={(event) => {
        event.currentTarget.style.boxShadow = "none";
        event.currentTarget.style.transform = "none";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: stat.bg,
          color: stat.fg,
        }}
      >
        <svg width={22} height={22} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {stat.icon}
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        {loading ? (
          <Skeleton width={64} height={26} style={{ marginBottom: 6 }} />
        ) : (
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1,
              marginBottom: 4,
              color: stat.value,
            }}
          >
            <CountUp to={value} />
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {stat.label}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ action }: { action: (typeof QUICK_ACTIONS)[number] }) {
  return (
    <Link
      href={action.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 22px",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        textDecoration: "none",
        color: "#111",
        transition: "all 0.15s",
      }}
      onMouseOver={(event) => {
        event.currentTarget.style.background = "#111";
        event.currentTarget.style.color = "#fff";
        event.currentTarget.style.borderColor = "#111";
      }}
      onMouseOut={(event) => {
        event.currentTarget.style.background = "#fff";
        event.currentTarget.style.color = "#111";
        event.currentTarget.style.borderColor = "#e5e7eb";
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: action.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width={18} height={18} fill="none" stroke={action.fg} viewBox="0 0 24 24">
          {action.icon}
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{action.title}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{action.subtitle}</div>
      </div>
    </Link>
  );
}

function RecentRow({ student }: { student: StudentRow }) {
  const status = student.is_certificate_approve
    ? { text: "Certified", bg: "#dbeafe", color: "#1d4ed8" }
    : student.marksheet_stage === "verified"
      ? { text: "Verified", bg: "#f3e8ff", color: "#7c3aed" }
      : student.marksheet_stage === "pending"
        ? { text: "Pending", bg: "#fef9c3", color: "#a16207" }
        : student.is_student_active
          ? { text: "Active", bg: "#dcfce7", color: "#15803d" }
          : { text: "Inactive", bg: "#fee2e2", color: "#dc2626" };

  return (
    <tr>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#9ca3af",
              flexShrink: 0,
            }}
          >
            {(student.student_name || "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <Link
              href={`/admin-abc/students/${student.student_id}`}
              style={{ fontSize: 13, fontWeight: 700, color: "#111", textDecoration: "none" }}
            >
              {student.student_name || "-"}
            </Link>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{student.registration_number}</div>
          </div>
        </div>
      </td>
      <td style={{ ...td, fontSize: 12 }}>{student.branch_name || "-"}</td>
      <td style={td}>{student.short_form || student.course_name || "-"}</td>
      <td style={td}>
        <span
          className="sa-dash-badge"
          style={{ background: status.bg, color: status.color }}
        >
          {status.text}
        </span>
      </td>
    </tr>
  );
}

function RecentSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid #f9fafb",
          }}
        >
          <Skeleton width={32} height={32} style={{ borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="42%" height={11} style={{ marginBottom: 6 }} />
            <Skeleton width="26%" height={9} />
          </div>
          <Skeleton width={110} height={11} />
          <Skeleton width={46} height={11} />
          <Skeleton width={62} height={18} style={{ borderRadius: 20 }} />
        </div>
      ))}
    </div>
  );
}

function BranchSkeleton() {
  return (
    <div>
      {Array.from({ length: 9 }, (_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <Skeleton width={8} height={8} style={{ borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="62%" height={11} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={9} />
          </div>
          <Skeleton width={38} height={11} />
        </div>
      ))}
    </div>
  );
}

/** Counts up once, matching the Blade page's saAnimateNum. */
function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(to === 0 ? 0 : 0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) {
      setValue(to);
      return;
    }
    done.current = true;

    if (to === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    let start: number | null = null;
    const duration = 600;

    const step = (timestamp: number) => {
      start ??= timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.floor((1 - (1 - progress) ** 3) * to));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(to);
    };

    requestAnimationFrame(step);
  }, [to]);

  return <>{value}</>;
}
