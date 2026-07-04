import { FormEvent } from "react";

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
  function handle(e: FormEvent) {
    e.preventDefault();
    if (requirement.trim().length >= 3) onSubmit();
  }

  return (
    <form className="card form" onSubmit={handle}>
      <label className="field-label" htmlFor="req">
        Describe what you want the code to do
      </label>
      <textarea
        id="req"
        className="textarea"
        placeholder="e.g. A REST endpoint that accepts a CSV upload and returns row count and column names as JSON."
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        rows={5}
      />

      <div className="controls">
        <div className="control">
          <label htmlFor="lang">Language</label>
          <select
            id="lang"
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

        <label className="checkbox">
          <input
            type="checkbox"
            checked={includeTests}
            onChange={(e) => setIncludeTests(e.target.checked)}
          />
          Include unit tests
        </label>

        <button
          type="submit"
          className="btn primary"
          disabled={loading || requirement.trim().length < 3}
        >
          {loading ? "Generating…" : "Generate code"}
        </button>
      </div>
    </form>
  );
}
