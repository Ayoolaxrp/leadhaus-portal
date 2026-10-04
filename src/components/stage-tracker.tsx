import { ONBOARDING_STAGES, type OnboardingStage } from "@/lib/data/types";

const plain: Record<OnboardingStage, string> = {
  "Not Started": "Not started",
  "In Progress": "Gathering details",
  "Ready for Strategy": "Planning",
  "Ready for Launch": "Ready to launch",
  Complete: "Complete",
};

export function StageTracker({ stage }: { stage: OnboardingStage }) {
  const at = ONBOARDING_STAGES.indexOf(stage);
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label={`Onboarding stage: ${plain[stage]}`}>
      {ONBOARDING_STAGES.map((s, i) => (
        <li key={s} aria-current={i === at ? "step" : undefined} className="min-w-0">
          <div className={`h-1.5 rounded-full ${i <= at ? "bg-accent" : "bg-surface-2"}`} />
          <p className={`mt-2 truncate text-[11px] ${i === at ? "font-medium text-text" : "text-muted"}`}>{plain[s]}</p>
        </li>
      ))}
    </ol>
  );
}
