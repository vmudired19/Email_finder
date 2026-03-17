import { useState } from "react";

const isLinkedinUrl = (url) => typeof url === "string" && url.includes("linkedin.com/");

export default function EmailList({ employees, selected, setSelected, onBack, onNext }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((e) => e.id));
  };

  const filtered = employees.filter((e) => {
    const matchFilter =
      filter === "all" ||
      (filter === "engineer" && e.title.toLowerCase().includes("engineer")) ||
      (filter === "recruiter" && (e.title.toLowerCase().includes("recruiter") || e.title.toLowerCase().includes("talent") || (e.dept && e.dept.toLowerCase().includes("people"))));
    const matchSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.company.toLowerCase().includes(search.toLowerCase()) ||
      e.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const isRecruiter = (e) =>
    e.title.toLowerCase().includes("recruiter") ||
    e.title.toLowerCase().includes("talent") ||
    (e.dept && e.dept.toLowerCase().includes("people")) ||
    (e.dept && e.dept.toLowerCase().includes("ops"));

  // Group by company
  const byCompany = filtered.reduce((acc, e) => {
    if (!acc[e.company]) acc[e.company] = [];
    acc[e.company].push(e);
    return acc;
  }, {});

  return (
    <div>
      <p className="page-title">Select contacts</p>
      <p className="page-subtitle">Choose who to reach out to. We recommend targeting engineers and recruiters together.</p>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search name, company, role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "engineer", "recruiter"].map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "8px 14px", fontSize: 11, textTransform: "capitalize" }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Select all bar */}
      <div
        className="card"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", marginBottom: 10 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
          <span style={{ color: "var(--text2)", fontSize: 12 }}>
            {selected.length} of {filtered.length} selected
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="tag tag-green">{filtered.filter((e) => !isRecruiter(e)).length} engineers</span>
          <span className="tag tag-blue">{filtered.filter((e) => isRecruiter(e)).length} recruiters</span>
        </div>
      </div>

      {/* Employee list grouped by company */}
      <div className="scroll-list" style={{ marginBottom: 32 }}>
        {Object.entries(byCompany).map(([company, emps]) => (
          <div key={company} style={{ marginBottom: 20 }}>
            <div style={{ color: "var(--text3)", fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, paddingLeft: 4 }}>
              {company.toUpperCase()}
            </div>
            {emps.map((e) => (
              <div
                key={e.id}
                className="card"
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", marginBottom: 6,
                  background: selected.includes(e.id) ? "var(--bg3)" : "var(--bg2)",
                  borderColor: selected.includes(e.id) ? "var(--border-hover)" : "var(--border)",
                  cursor: "pointer",
                }}
                onClick={() => toggle(e.id)}
              >
                <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} onClick={(ev) => ev.stopPropagation()} />
                <div
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: isRecruiter(e) ? "var(--blue-dim)" : "var(--accent-dim)",
                    border: `1px solid ${isRecruiter(e) ? "rgba(96,165,250,0.2)" : "rgba(200,245,66,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12,
                    color: isRecruiter(e) ? "var(--blue)" : "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  {e.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{e.name}</span>
                    <span className={`tag ${isRecruiter(e) ? "tag-blue" : "tag-green"}`}>
                      {isRecruiter(e) ? "RECRUITER" : "ENGINEER"}
                    </span>
                    {e.source === "linkedin" && <span className="tag tag-blue">LINKEDIN</span>}
                  </div>
                  <div style={{ color: "var(--text2)", fontSize: 11, marginTop: 2 }}>
                    {e.title} {e.dept ? `· ${e.dept}` : ""}
                  </div>
                  {isLinkedinUrl(e.linkedin_url) && (
                    <div style={{ marginTop: 4 }}>
                      <a
                        href={e.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none" }}
                      >
                        Verify on LinkedIn
                      </a>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--text2)" }}>{e.email}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{e.confidence}% confidence</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" disabled={selected.length === 0} onClick={onNext}>
          Generate emails for {selected.length} contacts →
        </button>
      </div>
    </div>
  );
}
