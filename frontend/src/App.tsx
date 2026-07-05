import { ReactNode, useEffect, useState } from "react";
import Scene3D from "./three/Scene3D";
import RequirementForm from "./components/RequirementForm";
import CodeOutput from "./components/CodeOutput";
import HistoryPanel from "./components/HistoryPanel";
import { useReveal, useScrollProgressBar, useTilt } from "./hooks";
import {
  IconLogo,
  IconWand,
  IconArrowDown,
  IconArrowRight,
  IconGithub,
  IconAlert,
  IconBolt,
  IconLayers,
  IconShield,
  IconDatabase,
  IconTerminal,
  IconCpu,
} from "./icons";
import {
  deleteHistory,
  fetchHealth,
  fetchHistory,
  generateCode,
  type GenerateResponse,
  type HistoryItem,
} from "./api";

const GITHUB = "https://github.com/YuvanSankar777/CodeGenAgent";

/* ---- small building blocks ---------------------------------------------- */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(7);
  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="card skeleton">
      <div className="sk-head">
        <span className="sk-dot" />
        <span className="sk-dot" />
        <span className="sk-dot" />
      </div>
      <div className="sk-body">
        <span className="sk-line" style={{ width: "45%" }} />
        <span className="sk-line" style={{ width: "80%" }} />
        <span className="sk-line" style={{ width: "65%" }} />
        <span className="sk-line" style={{ width: "72%" }} />
        <span className="sk-line" style={{ width: "38%" }} />
      </div>
      <div className="loading-note">
        <span className="spinner" />
        Asking Gemini to write your code…
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    t: "Describe it",
    d: "Write what you need in plain English — an endpoint, an algorithm, a hook. No boilerplate, no scaffolding.",
    icon: <IconTerminal />,
  },
  {
    n: "02",
    t: "Gemini reasons",
    d: "A prompt-engineered request with role, guardrails and a strict JSON schema drives Google Gemini to produce clean, idiomatic code.",
    icon: <IconCpu />,
  },
  {
    n: "03",
    t: "Ship it",
    d: "Get syntax-highlighted code, an explanation and dependencies — copy, download, or revisit it from your saved history.",
    icon: <IconBolt />,
  },
];

const FEATURES = [
  {
    icon: <IconWand />,
    t: "Prompt engineering",
    d: "Role priming, few-shot exemplars and explicit guardrails shape every request for reliable, production-grade output.",
    wide: true,
  },
  {
    icon: <IconLayers />,
    t: "Structured output",
    d: "A JSON schema forces valid, parseable results — never scraping code out of prose.",
  },
  {
    icon: <IconTerminal />,
    t: "8 languages",
    d: "Python, TypeScript, JavaScript, Java, C++, Go, Rust and SQL — with optional unit tests.",
  },
  {
    icon: <IconDatabase />,
    t: "Persistent history",
    d: "Every generation is saved to MySQL and instantly replayable from the sidebar.",
  },
  {
    icon: <IconShield />,
    t: "Resilient by design",
    d: "Automatic retries on transient Gemini errors and graceful degradation when the database is offline.",
    wide: true,
  },
];

export default function App() {
  const [requirement, setRequirement] = useState("");
  const [language, setLanguage] = useState("python");
  const [includeTests, setIncludeTests] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dbAvailable, setDbAvailable] = useState(true);
  const [model, setModel] = useState("");

  const progressRef = useScrollProgressBar<HTMLDivElement>();

  useEffect(() => {
    fetchHealth()
      .then((h) => {
        setDbAvailable(h.db_available);
        setModel(h.model);
      })
      .catch(() => setDbAvailable(false));
    refreshHistory();
  }, []);

  function refreshHistory() {
    fetchHistory().then(setHistory).catch(() => setHistory([]));
  }

  async function onSubmit() {
    setLoading(true);
    setError(null);
    document.getElementById("tool")?.scrollIntoView({ behavior: "smooth" });
    try {
      const res = await generateCode({
        requirement,
        language,
        include_tests: includeTests,
      });
      setResult(res);
      if (res.persisted) refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function selectHistory(item: HistoryItem) {
    setResult({
      id: item.id,
      language: item.language,
      filename: item.filename || "solution.txt",
      code: item.code,
      explanation: item.explanation || "",
      dependencies: item.dependencies || [],
      model: item.model || model,
      persisted: true,
    });
    setRequirement(item.requirement);
    setLanguage(item.language);
    document.getElementById("tool")?.scrollIntoView({ behavior: "smooth" });
  }

  async function removeHistory(id: number) {
    await deleteHistory(id);
    refreshHistory();
  }

  const headline = ["Turn", "words", "into"];

  return (
    <>
      <div className="progress" ref={progressRef} style={{ width: "0%" }} />

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="brand">
            <span className="logo">
              <IconLogo />
            </span>
            <span className="name">CodeGenAgent</span>
          </div>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#tool">Generator</a>
            <a href="#features">Features</a>
          </div>
          <div className="nav-right">
            {model && (
              <span className="pill model">
                <span className="dot" />
                {model}
              </span>
            )}
            <span className={`pill ${dbAvailable ? "on" : "off"}`}>
              <span className="dot" />
              {dbAvailable ? "history on" : "db offline"}
            </span>
          </div>
        </nav>

        {/* HERO */}
        <header className="hero">
          <Scene3D />
          <div className="hero-veil" />
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">
                <IconWand />
                Powered by Google Gemini 2.5
              </span>
              <h1>
                {headline.map((w, i) => (
                  <span
                    key={i}
                    className="word"
                    style={{ animationDelay: `${i * 0.12}s`, marginRight: "0.28em" }}
                  >
                    {w}
                  </span>
                ))}
                <br />
                <span
                  className="word"
                  style={{ animationDelay: `${headline.length * 0.12}s` }}
                >
                  production-ready <span className="mark">code</span>
                </span>
              </h1>
              <p className="lead">
                Describe what you want in plain language. CodeGenAgent turns it
                into clean, explained, ready-to-run code — with tests, saved
                history and one-click export.
              </p>
              <div className="hero-cta">
                <a href="#tool" className="btn primary">
                  <IconWand />
                  Start generating
                  <IconArrowDown />
                </a>
                <a
                  href={GITHUB}
                  target="_blank"
                  rel="noreferrer"
                  className="btn outline"
                >
                  <IconGithub />
                  View source
                </a>
              </div>
              <div className="scroll-cue">
                <span className="mouse" />
                scroll to explore
              </div>
            </div>

            <TiltCard className="hero-card">
              <div className="code-card">
                <div className="cc-head">
                  <span className="traffic">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="cc-name">is_prime.py</span>
                  <span className="lang-badge" style={{ marginLeft: "auto" }}>
                    python
                  </span>
                </div>
                <pre className="cc-body">
                  <span className="c-com"># requirement → "check if a number is prime"</span>
                  {"\n"}
                  <span className="c-key">def</span> <span className="c-fn">is_prime</span>(n: int) -&gt; <span className="c-key">bool</span>:{"\n"}
                  {"    "}<span className="c-key">if</span> n &lt; <span className="c-num">2</span>:{"\n"}
                  {"        "}<span className="c-key">return</span> <span className="c-key">False</span>{"\n"}
                  {"    "}<span className="c-key">for</span> i <span className="c-key">in</span> <span className="c-fn">range</span>(<span className="c-num">2</span>, <span className="c-fn">int</span>(n**<span className="c-num">0.5</span>)+<span className="c-num">1</span>):{"\n"}
                  {"        "}<span className="c-key">if</span> n % i == <span className="c-num">0</span>:{"\n"}
                  {"            "}<span className="c-key">return</span> <span className="c-key">False</span>{"\n"}
                  {"    "}<span className="c-key">return</span> <span className="c-key">True</span>
                </pre>
              </div>
            </TiltCard>
          </div>
        </header>

        {/* STATS */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <Reveal>
              <div className="stats">
                {[
                  ["8", "languages"],
                  ["2.5", "Gemini flash"],
                  ["JSON", "structured output"],
                  ["∞", "saved history"],
                ].map(([b, s]) => (
                  <div className="stat" key={s}>
                    <b>{b}</b>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" id="how">
          <div className="container">
            <Reveal>
              <span className="section-tag">How it works</span>
              <h2 className="section-title">From a sentence to a solution</h2>
              <p className="section-sub">
                Three steps, a few seconds. No setup, no boilerplate — just
                describe the problem and let the agent handle the rest.
              </p>
            </Reveal>
            <div className="steps">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 90}>
                  <TiltCard className="step-card">
                    <span className="step-icon">{s.icon}</span>
                    <span className="step-num">{s.n}</span>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TOOL */}
        <section className="section" id="tool">
          <div className="container">
            <Reveal>
              <span className="section-tag">Live generator</span>
              <h2 className="section-title">Try it now</h2>
              <p className="section-sub">
                Type a requirement, choose a language, and generate. Everything
                below is the real, working app.
              </p>
            </Reveal>

            <div className="tool-wrap">
              <div className="main-col">
                <RequirementForm
                  requirement={requirement}
                  setRequirement={setRequirement}
                  language={language}
                  setLanguage={setLanguage}
                  includeTests={includeTests}
                  setIncludeTests={setIncludeTests}
                  loading={loading}
                  onSubmit={onSubmit}
                />

                {error && (
                  <div className="card error">
                    <IconAlert />
                    <span>{error}</span>
                  </div>
                )}
                {loading && <LoadingCard />}
                {result && !loading && <CodeOutput result={result} />}
              </div>

              <HistoryPanel
                items={history}
                dbAvailable={dbAvailable}
                onSelect={selectHistory}
                onDelete={removeHistory}
              />
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features">
          <div className="container">
            <Reveal>
              <span className="section-tag">Under the hood</span>
              <h2 className="section-title">Built like a real product</h2>
              <p className="section-sub">
                A full-stack RAG-adjacent agent: React + FastAPI + Gemini +
                MySQL, containerized with Docker.
              </p>
            </Reveal>
            <div className="bento">
              {FEATURES.map((f, i) => (
                <Reveal key={f.t} delay={(i % 3) * 80} className={f.wide ? "feature-wide-wrap" : ""}>
                  <TiltCard className={`feature ${f.wide ? "wide" : ""}`}>
                    <span className="f-icon">{f.icon}</span>
                    <h3>{f.t}</h3>
                    <p>{f.d}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="container">
            <Reveal>
              <p className="cta-line">
                Ready to <span className="mark">generate something?</span>
              </p>
              <a href="#tool" className="btn primary" style={{ display: "inline-flex" }}>
                <IconWand />
                Open the generator
                <IconArrowRight />
              </a>
              <div className="stack">
                <span>React</span> <i>·</i> <span>FastAPI</span> <i>·</i>
                <span>Google Gemini</span> <i>·</i> <span>MySQL</span> <i>·</i>
                <span>Docker</span>
              </div>
            </Reveal>
          </div>
        </footer>
      </div>
    </>
  );
}
