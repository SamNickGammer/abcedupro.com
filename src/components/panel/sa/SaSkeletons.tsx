import { Skeleton } from "@/components/panel/sa/Spinner";

/**
 * Instant placeholders for Next's `loading.tsx`.
 *
 * These render before the server has done any work at all, which is the gap
 * the spinner inside the page could never cover: that spinner lives in the
 * HTML, so it cannot appear until the HTML exists. Neon is in Singapore, so
 * that gap is a few hundred milliseconds of nothing without this.
 *
 * Each shape matches the finished page, so filling in causes no reflow.
 */

export function DashboardSkeleton() {
  return (
    <div style={{ padding: "0 12px 40px" }}>
      <div className="sa-dash-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #111 0%, #1e1b4b 50%, #312e81 100%)",
            padding: "32px 36px",
          }}
        >
          <Skeleton width={110} height={9} style={{ marginBottom: 10, opacity: 0.25 }} />
          <Skeleton width={300} height={22} style={{ marginBottom: 10, opacity: 0.3 }} />
          <Skeleton width={340} height={11} style={{ opacity: 0.2 }} />
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 20 }}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: "22px 24px",
              display: "flex",
              gap: 16,
            }}
          >
            <Skeleton width={44} height={44} style={{ borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Skeleton width={64} height={26} style={{ marginBottom: 8 }} />
              <Skeleton width="70%" height={10} />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 22px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
            }}
          >
            <Skeleton width={38} height={38} style={{ borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Skeleton width="55%" height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="75%" height={9} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        <div className="sa-dash-card">
          <div className="sa-dash-card-inner">
            <Skeleton width={220} height={14} style={{ marginBottom: 20 }} />
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
        </div>

        <div className="sa-dash-card">
          <div className="sa-dash-card-inner">
            <Skeleton width={130} height={14} style={{ marginBottom: 20 }} />
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
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({
  title = 160,
  columns = 8,
  rows = 12,
}: {
  title?: number;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="sa-students-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Skeleton width={title} height={18} />
        <Skeleton width={90} height={12} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Skeleton width={300} height={38} style={{ borderRadius: 10 }} />
        <Skeleton width={170} height={38} style={{ borderRadius: 10 }} />
        <Skeleton width={140} height={38} style={{ borderRadius: 10 }} />
      </div>

      <table className="sa-stu-table">
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: columns }, (_, cell) => (
                <td key={cell}>
                  <Skeleton height={11} width={`${[70, 88, 80, 92, 46, 84, 70, 60][cell] ?? 70}%`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** For pages not yet given a bespoke shape. */
export function CardSkeleton() {
  return (
    <div className="sa-students-card">
      <Skeleton width={180} height={18} style={{ marginBottom: 20 }} />
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} style={{ padding: "14px 0", borderBottom: "1px solid #f9fafb" }}>
          <Skeleton width={`${40 + (index % 4) * 12}%`} height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="28%" height={9} />
        </div>
      ))}
    </div>
  );
}
