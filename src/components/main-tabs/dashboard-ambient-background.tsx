export type DashboardAmbientTheme = "recruitment" | "positioning" | "general";

interface DashboardAmbientBackgroundProps {
  theme: DashboardAmbientTheme;
}

const themeBaseClass: Record<DashboardAmbientTheme, string> = {
  recruitment: "dashboard-ambient-base dashboard-ambient-base--recruitment",
  positioning: "dashboard-ambient-base dashboard-ambient-base--positioning",
  general: "dashboard-ambient-base dashboard-ambient-base--general",
};

export function DashboardAmbientBackground({ theme }: DashboardAmbientBackgroundProps) {
  return (
    <div className="pointer-events-none absolute inset-0 min-h-full overflow-hidden" aria-hidden>
      <div className={`${themeBaseClass[theme]} absolute inset-0 min-h-full`} />
    </div>
  );
}
