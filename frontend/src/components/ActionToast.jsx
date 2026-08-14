import "./ActionToast.css";

export default function ActionToast({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="action-toast-banner animate-bounce">
      <div className="toast-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="toast-text">{message}</span>
      </div>
      <button onClick={onClose} className="toast-close-btn">✕</button>
    </div>
  );
}
