import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

const POPULAR = ["Google", "Stripe", "OpenAI", "Anthropic", "Figma", "Vercel", "Linear"];

export default function CompanySearch({ companies, setCompanies, onNext }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addCompany = async (name) => {
    const clean = name.trim();
    if (!clean) return;
    if (companies.find((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      setError("Already added");
      return;
    }
    setLoading(true);
    setError("");

    let found = [];
    try {
      const res = await fetch(`${API_BASE}/api/search-employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: clean }),
      });
      if (!res.ok) {
        let msg = `Search failed: ${res.status}`;
        try {
          const err = await res.json();
          msg = err?.detail || msg;
        } catch {
          // Keep default status-based message.
        }
        throw new Error(msg);
      }
      const data = await res.json();
      found = Array.isArray(data.employees) ? data.employees : [];
    } catch (err) {
      found = [];
      setError(err?.message || "Could not fetch real contacts.");
    }

    setCompanies((prev) => [
      ...prev,
      {
        name: clean,
        employeeCount: found.length,
        status: found.length > 0 ? "found" : "empty",
        employees: found,
      },
    ]);
    setInput("");
    setLoading(false);
  };

  const removeCompany = (name) => {
    setCompanies((prev) => prev.filter((c) => c.name !== name));
  };

  const handleNext = async () => {
    // Gather employees captured during search for each added company.
    const allEmps = companies.flatMap((c) => c.employees || []);
    onNext(allEmps);
  };

  const totalFound = companies.reduce((a, c) => a + c.employeeCount, 0);

  return (
    <div>
      <p className="page-title">Target companies</p>
      <p className="page-subtitle">Add companies you want to reach out to. We'll find engineers and recruiters automatically.</p>

      {/* Search input */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            placeholder="Company name (e.g. Stripe)"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && addCompany(input)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => addCompany(input)}
            disabled={loading || !input.trim()}
            style={{ whiteSpace: "nowrap" }}
          >
            {loading ? "Searching…" : "+ Add"}
          </button>
        </div>
        {error && <p style={{ color: "var(--red)", fontSize: 11, marginTop: 8 }}>{error}</p>}

        {/* Quick add pills */}
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "var(--text3)", fontSize: 11, marginBottom: 8 }}>Quick add</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {POPULAR.map((p) => (
              <button
                key={p}
                className="btn btn-ghost"
                style={{ padding: "4px 12px", fontSize: 11 }}
                onClick={() => addCompany(p)}
                disabled={!!companies.find((c) => c.name.toLowerCase() === p.toLowerCase())}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Company list */}
      {companies.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {companies.map((c, idx) => (
            <div
              key={`${c.name}-${idx}`}
              className="card"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "16px 20px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "var(--bg3)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontFamily: "Syne, sans-serif", fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {c.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--text)", fontSize: 13 }}>{c.name}</div>
                  <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>
                    {c.status === "found" ? `${c.employeeCount} contacts found` : "No contacts found — will skip"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`tag ${c.status === "found" ? "tag-green" : "tag-gray"}`}>
                  {c.status === "found" ? "FOUND" : "EMPTY"}
                </span>
                <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => removeCompany(c.name)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {companies.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px", color: "var(--text3)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⟡</div>
          <div>Add your first company above to get started</div>
        </div>
      )}

      {/* Footer */}
      {companies.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "var(--text2)", fontSize: 12 }}>
            {totalFound} contacts ready across {companies.filter((c) => c.status === "found").length} companies
          </p>
          <button className="btn btn-primary" disabled={totalFound === 0} onClick={handleNext}>
            View contacts →
          </button>
        </div>
      )}
    </div>
  );
}
