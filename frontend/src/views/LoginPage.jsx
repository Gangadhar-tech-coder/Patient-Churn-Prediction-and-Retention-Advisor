import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { signin, signup } = useAuth();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(name, email, password);
      } else {
        await signin(email, password);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h2>Patient Churn Prediction</h2>
          <p className="login-subtitle">
            {mode === "signin"
              ? "Sign in to access your clinical dashboard"
              : "Create an account to get started"}
          </p>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => { setMode("signin"); setError(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="login-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === "signup" && (
            <div className="login-field">
              <label htmlFor="login-name">Full Name</label>
              <input
                id="login-name"
                type="text"
                placeholder="Dr. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="doctor@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading
              ? "Authenticating..."
              : mode === "signin"
              ? "Sign In to Dashboard"
              : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
