import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./AuthModal.css";

export default function AuthModal({ onClose }) {
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
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>✕</button>
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h2>Patient Churn Prediction</h2>
          <p className="auth-subtitle">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => { setMode("signin"); setError(""); }}
          >Sign In</button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
          >Sign Up</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text" placeholder="Dr. Jane Smith"
                value={name} onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email" placeholder="doctor@hospital.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password" placeholder="Enter password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6}
            />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
