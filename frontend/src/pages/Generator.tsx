import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RequirementForm from "../components/RequirementForm";
import CodeOutput from "../components/CodeOutput";
import HistoryPanel from "../components/HistoryPanel";
import { LoadingCard } from "../ui";
import { useAuth } from "../auth";
import { IconLogo, IconAlert } from "../icons";
import {
  ApiError,
  deleteHistory,
  fetchHealth,
  fetchHistory,
  generateCode,
  type GenerateResponse,
  type HistoryItem,
} from "../api";

export default function Generator() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** If the session expired, sign out and bounce to login. Returns true if handled. */
  function handleAuth(err: unknown): boolean {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  }

  function refreshHistory() {
    fetchHistory()
      .then(setHistory)
      .catch((e) => {
        if (!handleAuth(e)) setHistory([]);
      });
  }

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateCode({ requirement, language, include_tests: includeTests });
      setResult(res);
      if (res.persisted) refreshHistory();
    } catch (e) {
      if (!handleAuth(e)) setError(e instanceof Error ? e.message : "Something went wrong.");
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
  }

  async function removeHistory(id: number) {
    try {
      await deleteHistory(id);
    } catch (e) {
      handleAuth(e);
    }
    refreshHistory();
  }

  return (
    <div className="app-shell">
      <header className="app-bar">
        <Link to="/" className="brand">
          <span className="logo"><IconLogo /></span>
          <span className="name">CodeGenAgent</span>
        </Link>
        <div className="app-bar-right">
          {model && (
            <span className="pill model"><span className="dot" />{model}</span>
          )}
          <span className={`pill ${dbAvailable ? "on" : "off"}`}>
            <span className="dot" />{dbAvailable ? "history on" : "db offline"}
          </span>
          <span className="who">{user?.name || user?.email}</span>
          <button className="btn ghost" onClick={() => { logout(); navigate("/"); }}>
            Log out
          </button>
        </div>
      </header>

      <div className="app-body">
        <div className="tool-wrap">
          <div className="main-col app-main">
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
              <div className="card error"><IconAlert /><span>{error}</span></div>
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
    </div>
  );
}
