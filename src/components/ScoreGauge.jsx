import { memo } from "react";
import { getScoreColor } from "../utils/scoreTranslator";

export default memo(function ScoreGauge({ score, size = 80, showLabel = true }) {
  const { ring, text } = getScoreColor(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor"
          className="text-white/5" strokeWidth="6"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={ring} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${text}`}>{score}</span>
      </div>
      {showLabel && (
        <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Score</span>
      )}
    </div>
  );
})
