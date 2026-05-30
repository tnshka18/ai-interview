import React, { useEffect } from 'react';

export default function Modal({ title, subtitle, children, actions, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-title">{title}</div>
        {subtitle && <div className="modal-sub">{subtitle}</div>}
        <div>{children}</div>
        {actions && (
          <div className="modal-actions">
            {actions.map((a, i) => (
              <button key={i} className={`btn ${a.className || 'btn-outline'}`} onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
