import { type ReactNode } from "react";
import { useReveal, useTilt } from "./hooks";

/** Fade/rise a block into view on scroll. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Card that tilts in 3D toward the cursor. */
export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(7);
  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

/** Skeleton shown while a generation is in flight. */
export function LoadingCard() {
  return (
    <div className="card skeleton">
      <div className="sk-head">
        <span className="sk-dot" />
        <span className="sk-dot" />
        <span className="sk-dot" />
      </div>
      <div className="sk-body">
        <span className="sk-line" style={{ width: "45%" }} />
        <span className="sk-line" style={{ width: "80%" }} />
        <span className="sk-line" style={{ width: "65%" }} />
        <span className="sk-line" style={{ width: "72%" }} />
        <span className="sk-line" style={{ width: "38%" }} />
      </div>
      <div className="loading-note">
        <span className="spinner" />
        Asking Gemini to write your code…
      </div>
    </div>
  );
}
