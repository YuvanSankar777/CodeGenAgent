import { Link } from "react-router-dom";
import Scene3D from "../three/Scene3D";
import { useScrollProgressBar } from "../hooks";
import { Reveal, TiltCard } from "../ui";
import { useAuth } from "../auth";
import {
  IconLogo,
  IconWand,
  IconArrowDown,
  IconArrowRight,
  IconGithub,
  IconBolt,
  IconLayers,
  IconShield,
  IconDatabase,
  IconTerminal,
  IconCpu,
} from "../icons";

const GITHUB = "https://github.com/YuvanSankar777/CodeGenAgent";

const STEPS = [
  { n: "01", t: "Describe it", d: "Write what you need in plain English — an endpoint, an algorithm, a hook. No boilerplate, no scaffolding.", icon: <IconTerminal /> },
  { n: "02", t: "Gemini reasons", d: "A prompt-engineered request with role, guardrails and a strict JSON schema drives Google Gemini to produce clean, idiomatic code.", icon: <IconCpu /> },
  { n: "03", t: "Ship it", d: "Get syntax-highlighted code, an explanation and dependencies — copy, download, or revisit it from your saved history.", icon: <IconBolt /> },
];

const FEATURES = [
  { icon: <IconWand />, t: "Prompt engineering", d: "Role priming, few-shot exemplars and explicit guardrails shape every request for reliable, production-grade output.", wide: true },
  { icon: <IconLayers />, t: "Structured output", d: "A JSON schema forces valid, parseable results — never scraping code out of prose." },
  { icon: <IconTerminal />, t: "8 languages", d: "Python, TypeScript, JavaScript, Java, C++, Go, Rust and SQL — with optional unit tests." },
  { icon: <IconDatabase />, t: "Private history", d: "Every generation is saved to your account and instantly replayable from the sidebar." },
  { icon: <IconShield />, t: "Resilient by design", d: "Automatic retries on transient Gemini errors and graceful database fallback.", wide: true },
];

export default function Home() {
  const progressRef = useScrollProgressBar<HTMLDivElement>();
  const { user } = useAuth();
  const primaryTo = user ? "/app" : "/signup";
  const primaryLabel = user ? "Open generator" : "Get started free";
  const headline = ["Turn", "words", "into"];

  return (
    <>
      <div className="progress" ref={progressRef} style={{ width: "0%" }} />
      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="brand">
            <span className="logo"><IconLogo /></span>
            <span className="name">CodeGenAgent</span>
          </div>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
          </div>
          <div className="nav-right">
            {user ? (
              <Link to="/app" className="btn primary" style={{ padding: "9px 16px" }}>
                Open app <IconArrowRight />
              </Link>
            ) : (
              <>
                <Link to="/login" className="nav-signin">Sign in</Link>
                <Link to="/signup" className="btn primary" style={{ padding: "9px 16px" }}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* HERO */}
        <header className="hero">
          <Scene3D />
          <div className="hero-veil" />
          <div className="container hero-grid">
            <div>
              <span className="eyebrow"><IconWand /> Powered by Google Gemini 2.5</span>
              <h1>
                {headline.map((w, i) => (
                  <span key={i} className="word" style={{ animationDelay: `${i * 0.12}s`, marginRight: "0.28em" }}>{w}</span>
                ))}
                <br />
                <span className="word" style={{ animationDelay: `${headline.length * 0.12}s` }}>
                  production-ready <span className="mark">code</span>
                </span>
              </h1>
              <p className="lead">
                Describe what you want in plain language. CodeGenAgent turns it
                into clean, explained, ready-to-run code — with tests, private
                saved history and one-click export.
              </p>
              <div className="hero-cta">
                <Link to={primaryTo} className="btn primary">
                  <IconWand /> {primaryLabel} <IconArrowDown />
                </Link>
                <a href={GITHUB} target="_blank" rel="noreferrer" className="btn outline">
                  <IconGithub /> View source
                </a>
              </div>
              <div className="scroll-cue"><span className="mouse" /> scroll to explore</div>
            </div>

            <TiltCard className="hero-card">
              <div className="code-card">
                <div className="cc-head">
                  <span className="traffic"><i /><i /><i /></span>
                  <span className="cc-name">is_prime.py</span>
                  <span className="lang-badge" style={{ marginLeft: "auto" }}>python</span>
                </div>
                <pre className="cc-body">
                  <span className="c-com"># requirement → "check if a number is prime"</span>{"\n"}
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
                {[["8", "languages"], ["2.5", "Gemini flash"], ["JSON", "structured output"], ["∞", "saved history"]].map(([b, s]) => (
                  <div className="stat" key={s}><b>{b}</b><span>{s}</span></div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* HOW */}
        <section className="section" id="how">
          <div className="container">
            <Reveal>
              <span className="section-tag">How it works</span>
              <h2 className="section-title">From a sentence to a solution</h2>
              <p className="section-sub">Three steps, a few seconds. No setup, no boilerplate — just describe the problem and let the agent handle the rest.</p>
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

        {/* CTA band */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <Reveal>
              <div className="cta-band">
                <div>
                  <h2 className="section-title" style={{ margin: 0 }}>
                    Create an account & <span className="mark">start building</span>
                  </h2>
                  <p className="section-sub" style={{ marginTop: 10 }}>
                    Free to try. Your generations are saved privately to your account.
                  </p>
                </div>
                <Link to={primaryTo} className="btn primary" style={{ whiteSpace: "nowrap" }}>
                  <IconWand /> {primaryLabel} <IconArrowRight />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features">
          <div className="container">
            <Reveal>
              <span className="section-tag">Under the hood</span>
              <h2 className="section-title">Built like a real product</h2>
              <p className="section-sub">A full-stack AI agent: React + FastAPI + Gemini + MySQL, containerized with Docker.</p>
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
              <p className="cta-line">Ready to <span className="mark">generate something?</span></p>
              <Link to={primaryTo} className="btn primary" style={{ display: "inline-flex" }}>
                <IconWand /> {primaryLabel} <IconArrowRight />
              </Link>
              <div className="stack">
                <span>React</span> <i>·</i> <span>FastAPI</span> <i>·</i>
                <span>Google Gemini</span> <i>·</i> <span>MySQL</span> <i>·</i> <span>Docker</span>
              </div>
            </Reveal>
          </div>
        </footer>
      </div>
    </>
  );
}
