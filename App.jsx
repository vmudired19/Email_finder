import { useState } from "react";
import CompanySearch from "./CompanySearch";
import EmailList from "./EmailList";
import EmailComposer from "./EmailComposer";
import SendQueue from "./SendQueue";
import "./styles.css";

const STEPS = ["search", "emails", "compose", "send"];

export default function App() {
  const [step, setStep] = useState("search");
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState([]);
  const [emailDrafts, setEmailDrafts] = useState([]);

  const goTo = (s) => setStep(s);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⟡</span>
            <span className="logo-text">reachout</span>
          </div>
          <nav className="steps-nav">
            {[
              { id: "search", label: "01 Companies" },
              { id: "emails", label: "02 People" },
              { id: "compose", label: "03 Compose" },
              { id: "send", label: "04 Send" },
            ].map((s, i) => {
              const idx = STEPS.indexOf(step);
              const sIdx = STEPS.indexOf(s.id);
              return (
                <button
                  key={s.id}
                  className={`step-btn ${step === s.id ? "active" : ""} ${sIdx < idx ? "done" : ""}`}
                  onClick={() => sIdx <= idx && goTo(s.id)}
                >
                  {sIdx < idx && <span className="check">✓</span>}
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="main">
        {step === "search" && (
          <CompanySearch
            companies={companies}
            setCompanies={setCompanies}
            onNext={(emps) => {
              setEmployees(emps);
              setSelected(emps.map((e) => e.id));
              goTo("emails");
            }}
          />
        )}
        {step === "emails" && (
          <EmailList
            employees={employees}
            selected={selected}
            setSelected={setSelected}
            onBack={() => goTo("search")}
            onNext={() => goTo("compose")}
          />
        )}
        {step === "compose" && (
          <EmailComposer
            employees={employees.filter((e) => selected.includes(e.id))}
            drafts={emailDrafts}
            setDrafts={setEmailDrafts}
            onBack={() => goTo("emails")}
            onNext={() => goTo("send")}
          />
        )}
        {step === "send" && (
          <SendQueue
            drafts={emailDrafts}
            onBack={() => goTo("compose")}
          />
        )}
      </main>
    </div>
  );
}
