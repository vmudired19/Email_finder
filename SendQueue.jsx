import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

export default function SendQueue({ drafts, onBack }) {
  const [statuses, setStatuses] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const sendAll = async () => {
    setSending(true);
    setStatuses({});
    drafts.forEach((d) => {
      setStatuses((prev) => ({ ...prev, [d.employee.id]: "sending" }));
    });

    try {
      const payload = {
        emails: drafts.map((d) => ({
          to_email: d.employee.email,
          to_name: d.employee.name,
          subject: d.subject,
          body: d.body,
        })),
      };

      const res = await fetch(`${API_BASE}/api/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Send failed: ${res.status}`);
      const data = await res.json();
      const resultByEmail = new Map((data.results || []).map((r) => [r.email, r.status]));

      drafts.forEach((d) => {
        const backendStatus = resultByEmail.get(d.employee.email);
        setStatuses((prev) => ({
          ...prev,
          [d.employee.id]: backendStatus === "sent" ? "sent" : "failed",
        }));
      });
    } catch {
      drafts.forEach((d) => {
        setStatuses((prev) => ({ ...prev, [d.employee.id]: "failed" }));
      });
    }

    setSending(false);
    setDone(true);
  };

  const sentCount = Object.values(statuses).filter((s) => s === "sent").length;
  const failedCount = Object.values(statuses).filter((s) => s === "failed").length;

  return (
    <div>
      <p className="page-title">Send queue</p>
      <p className="page-subtitle">Review your emails one last time, then send individually or all at once.</p>

      {/* Summary bar */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--text)" }}>{drafts.length}</div>
            <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.06em" }}>TOTAL</div>
          </div>
          {done && (
            <>
              <div>
                <div style={{ fontSize: 22, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--accent)" }}>{sentCount}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.06em" }}>SENT</div>
              </div>
              {failedCount > 0 && (
                <div>
                  <div style={{ fontSize: 22, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--red)" }}>{failedCount}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.06em" }}>FAILED</div>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onBack}>← Edit drafts</button>
          {!done && (
            <button className="btn btn-primary" onClick={sendAll} disabled={sending}>
              {sending ? `Sending… (${sentCount + failedCount}/${drafts.length})` : `Send all ${drafts.length} emails`}
            </button>
          )}
          {done && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", fontSize: 12 }}>
              <span>✓</span> All done!
            </div>
          )}
        </div>
      </div>

      {/* Email list */}
      <div className="scroll-list">
        {drafts.map((d) => {
          const status = statuses[d.employee.id] || "queued";
          return (
            <div
              key={d.employee.id}
              className="card"
              style={{ marginBottom: 8, padding: "16px 20px" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <StatusBadge status={status} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{d.employee.name}</span>
                    <span style={{ color: "var(--text3)", fontSize: 11 }}>·</span>
                    <span style={{ color: "var(--text3)", fontSize: 11 }}>{d.employee.company}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>
                    <span style={{ color: "var(--text3)" }}>To: </span>{d.employee.email}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
                    <span style={{ color: "var(--text3)" }}>Subject: </span>{d.subject}
                  </div>
                  <div
                    style={{
                      fontSize: 11, color: "var(--text3)", lineHeight: 1.6,
                      borderLeft: "2px solid var(--border)", paddingLeft: 10,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {d.body}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {done && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Outreach sent!
          </div>
          <div style={{ color: "var(--text2)", fontSize: 13, marginBottom: 20 }}>
            {sentCount} emails delivered. Expect replies within 3–7 days.
          </div>
          <div style={{ color: "var(--text3)", fontSize: 11 }}>
            Tip: follow up once after 5–7 days if you don't hear back.
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    queued: { label: "QUEUED", cls: "tag-gray" },
    sending: { label: "SENDING…", cls: "tag-blue" },
    sent: { label: "SENT", cls: "tag-green" },
    failed: { label: "FAILED", cls: "tag-red" },
  };
  const { label, cls } = map[status] || map.queued;
  return <span className={`tag ${cls}`}>{label}</span>;
}
