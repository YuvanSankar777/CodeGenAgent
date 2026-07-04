import { FormEvent, KeyboardEvent } from "react";
import { IconSparkle } from "../icons";

const LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "java",
  "cpp",
  "go",
  "rust",
  "sql",
];

const EXAMPLES = [
  "A REST endpoint that accepts a CSV upload and returns row count and column names as JSON",
  "A debounce hook in TypeScript with cleanup",
  "SQL query for the top 5 customers by revenue this quarter",
];

interface Props {
  requirement: string;
  setRequirement: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  includeTests: boolean;
  setIncludeTests: (v: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
}

export default function RequirementForm({
  requirement,
  setRequirement,
  language,
  setLanguage,
  includeTests,
  setIncludeTests,
  loading,
  onSubmit,
}: Props) {
  const valid = requirement.trim().length >= 3;

  function handle(e: FormEvent) {
    e.preventDefault();
    if (valid && !loading) onSubmit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && valid && !loading) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form className="card form" onSubmit={handle}>
      <div className="form-head">
        <span className="step">01</span>
        <label className="field-label" htmlFor="req">
          Describe what you want the code to do
        </label>
      </div>

      <div className="textarea-wrap">
        <textarea
          id="req"
          className="textarea"
          placeholder="e.g. A Python function that validates an email address with a regex and returns a boolean."
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          onKeyDown={onKeyDown}
          rows={5}
        />
        <span className="char-count">{requirement.length} chars</span>
      </div>

      <div className="examples">
        <span className="lbl">Try:</span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            className="chip"
            onClick={() => setRequirement(ex)}
            title={ex}
          >
            {ex.length > 42 ? ex.slice(0, 40) + "…" : ex}
          </button>
        ))}
      </div>

      <div className="controls">
        <div className="control">
          <label htmlFor="lang">Language</label>
          <select
            id="lang"
            className="select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <label className="switch">
          <span className="lbl">Unit tests</span>
          <span className="switch-row">
            <input
              type="checkbox"
              checked={includeTests}
              onChange={(e) => setIncludeTests(e.target.checked)}
            />
            <span className="track" />
            <span className="txt">{includeTests ? "Included" : "Off"}</span>
          </span>
        </label>

        <button type="submit" className="btn primary" disabled={loading || !valid}>
          <IconSparkle />
          {loading ? "Generating…" : "Generate code"}
          <span className="kbd">⌘↵</span>
        </button>
      </div>
    </form>
  );
}
