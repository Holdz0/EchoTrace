"use client";

interface Props {
  x: number;
  y: number;
  severity: "critical" | "warning" | "success";
  label?: string;
}

export default function RadarPing({ x, y, severity, label }: Props) {
  const color = severity === "critical" ? "#ef4444" : severity === "success" ? "#22c55e" : "#f59e0b";

  return (
    <div
      style={{
        position: "absolute",
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes radarRing {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.85; }
          100% { transform: translate(-50%,-50%) scale(4);   opacity: 0; }
        }
        @keyframes corePulse {
          0%, 100% { box-shadow: 0 0 6px 2px ${color}99; }
          50%       { box-shadow: 0 0 14px 5px ${color}cc; }
        }
      `}</style>

      {/* Three staggered expanding rings */}
      {[0, 0.55, 1.1].map((delay) => (
        <div
          key={delay}
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: 22, height: 22,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            animation: `radarRing 2.2s ease-out infinite`,
            animationDelay: `${delay}s`,
            opacity: 0,
          }}
        />
      ))}

      {/* Center dot */}
      <div
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 9, height: 9,
          borderRadius: "50%",
          background: color,
          animation: "corePulse 1.5s ease-in-out infinite",
        }}
      />

      {/* Province label chip */}
      {label && (
        <div
          style={{
            position: "absolute",
            top: "calc(50% + 14px)",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 8,
            fontWeight: 700,
            color,
            whiteSpace: "nowrap",
            background: "rgba(2,11,24,0.9)",
            padding: "2px 5px",
            borderRadius: 3,
            border: `1px solid ${color}55`,
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
