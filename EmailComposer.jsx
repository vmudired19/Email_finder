import { useState } from "react";

const TONES = ["professional", "friendly", "concise"];
const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

async function generateEmail(employee, tone, myName, myRole, myBio) {
  const res = await fetch(`${API_BASE}/api/generate-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee,
      tone,
      sender_name: myName,
      sender_role: myRole,
      sender_bio: myBio,
    }),
  });
  if (!res.ok) {
    throw new Error(`Generate failed: ${res.status}`);
  }
  const data = await res.json();
  return {
    subject: data.subject || "Quick intro",
    body: data.body || "",
  };
}

export default function EmailComposer({ employees, drafts, setDrafts, onBack, onNext }) {
  const [myName, setMyName] = useState("");
  const [myRole, setMyRole] = useState("");
  const [myBio, setMyBio] = useState("");
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  const allGenerated = drafts.length === employees.length && drafts.length > 0;

  const generateAll = async () => {
    setGenerating(true);
    setDrafts([]);
    setProgress(0);
    const results = [];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      let draft = { subject: "Quick intro", body: "" };
      try {
        draft = await generateEmail(emp, tone, myName, myRole, myBio);
      } catch {
        draft = {
          subject: `Quick intro - ${emp.company}`,
          body: `Hi ${emp.name},\n\nI'm ${myName || "a software engineer"} and wanted to introduce myself. I'd love to briefly connect about your work at ${emp.company}.\n\nBest,\n${myName || ""}`,
        };
      }
      results.push({ ...draft, employee: emp, edited: false });
      setProgress(i + 1);
      setDrafts([...results]);
    }
    setGenerating(false);
    setActiveIdx(0);
  };

  const updateDraft = (i, field, val) => {
    setDrafts((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: val, edited: true };
      return copy;
    });
  };

  const activeDraft = drafts[activeIdx];

  return (
    <div>
      <p className="page-title">Compose emails</p>
      <p className="page-subtitle">Claude will write a personalised email for each contact. Review and edit before sending.</p>

      {/* Sender profile */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ color: "var(--text3)", fontSize: 10, letterSpacing: "0.1em", marginBottom: 14 }}>YOUR PROFILE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>Your name</label>
            <input type="text" placeholder="Alex Johnson" value={myName} onChange={(e) => setMyName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>Current role / background</label>
            <input type="text" placeholder="Full-stack engineer, 4 yrs exp" value={myRole} onChange={(e) => setMyRole(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>Short bio (optional)</label>
          <textarea
            placeholder="e.g. I've built React apps at a fintech startup, love distributed systems, looking for senior roles at product-led companies."
            value={myBio}
            onChange={(e) => setMyBio(e.target.value)}
            style={{ minHeight: 70 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)", marginRight: 4 }}>Tone:</span>
            {TONES.map((t) => (
              <button
                key={t}
                className={`btn ${tone === t ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "5px 12px", fontSize: 11, textTransform: "capitalize" }}
                onClick={() => setTone(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={generateAll} disabled={generating}>
            {generating
              ? `Generating ${progress}/${employees.length}…`
              : allGenerated
              ? "↺ Regenerate all"
              : `✦ Generate ${employees.length} emails`}
          </button>
        </div>
      </div>

      {/* Draft editor */}
      {drafts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, marginBottom: 32 }}>
          {/* Left: recipient list */}
          <div>
            <div style={{ color: "var(--text3)", fontSize: 10, letterSpacing: "0.1em", marginBottom: 10 }}>RECIPIENTS</div>
            <div className="scroll-list" style={{ maxHeight: 460 }}>
              {drafts.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  style={{
                    width: "100%", textAlign: "left",
                    background: activeIdx === i ? "var(--bg3)" : "transparent",
                    border: activeIdx === i ? "1px solid var(--border-hover)" : "1px solid transparent",
                    borderRadius: 8, padding: "10px 12px", marginBottom: 4,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className={`dot ${d.edited ? "dot-yellow" : "dot-green"}`} />
                    <span style={{ fontWeight: 500, fontSize: 12, color: "var(--text)" }}>{d.employee.name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, paddingLeft: 15 }}>{d.employee.company}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: draft editor */}
          {activeDraft && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>To: {activeDraft.employee.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{activeDraft.employee.email}</div>
                </div>
                {activeDraft.edited && <span className="tag tag-gray">EDITED</span>}
              </div>
              <div className="divider" style={{ margin: "12px 0" }} />
              <div>
                <label style={{ fontSize: 11, color: "var(--text2)", display: "block", marginBottom: 6 }}>Subject</label>
                <input
                  type="text"
                  value={activeDraft.subject}
                  onChange={(e) => updateDraft(activeIdx, "subject", e.target.value)}
                />
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, color: "var(--text2)", display: "block", marginBottom: 6 }}>Body</label>
                <textarea
                  value={activeDraft.body}
                  onChange={(e) => updateDraft(activeIdx, "body", e.target.value)}
                  style={{ minHeight: 200 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state while not yet generated */}
      {drafts.length === 0 && !generating && (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--text3)", marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
          <div>Fill in your profile above and click Generate to create personalised emails</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" disabled={!allGenerated} onClick={onNext}>
          Review & send {drafts.length} emails →
        </button>
      </div>
    </div>
  );
}
