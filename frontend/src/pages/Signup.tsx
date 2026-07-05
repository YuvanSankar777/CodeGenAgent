import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError } from "../api";
import { IconLogo, IconAlert, IconArrowRight } from "../icons";

export default function Signup() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup(email.trim(), password, name.trim() || undefined);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-bg" />
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="logo"><IconLogo /></span>
          <span className="name">CodeGenAgent</span>
        </Link>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Free to start. Your generations stay private to you.</p>

        {error && (
          <div className="auth-error"><IconAlert /><span>{error}</span></div>
        )}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span>Name <em>(optional)</em></span>
            <input type="text" autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input type="password" autoComplete="new-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </label>
          <button type="submit" className="btn primary auth-submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"} <IconArrowRight />
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
