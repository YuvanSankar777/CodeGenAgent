import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError } from "../api";
import { IconLogo, IconAlert, IconArrowRight } from "../icons";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
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
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account to keep generating.</p>

        {error && (
          <div className="auth-error"><IconAlert /><span>{error}</span></div>
        )}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <button type="submit" className="btn primary auth-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <IconArrowRight />
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
