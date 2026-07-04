import { useEffect, useState } from "react";
import RequirementForm from "./components/RequirementForm";
import CodeOutput from "./components/CodeOutput";
import HistoryPanel from "./components/HistoryPanel";
import {
  deleteHistory,
  fetchHealth,
  fetchHistory,
  generateCode,
  type GenerateResponse,
  type HistoryItem,
} from "./api";

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeHistory(id: number) {
    await deleteHistory(id);
    refreshHistory();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">⌘</span>
          <div>
            <h1>CodeGenAgent</h1>
            <p className="tagline">Requirements → production-ready code</p>
          </div>
        </div>
        {model && <span className="model-badge">{model}</span>}
      </header>

      <main className="layout">
        <section className="main-col">
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

          {error && <div className="card error">⚠ {error}</div>}
          {loading && (
            <div className="card loading">Asking Gemini to write your code…</div>
          )}
          {result && !loading && <CodeOutput result={result} />}
        </section>

        <HistoryPanel
          items={history}
          dbAvailable={dbAvailable}
          onSelect={selectHistory}
          onDelete={removeHistory}
        />
      </main>

      <footer className="footer">
        Built with React · FastAPI · Google Gemini · MySQL · Docker
      </footer>
    </div>
  );
}
