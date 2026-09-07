export type DashboardAmbientTheme = "recruitment" | "positioning" | "general" | "dovrut";

interface DashboardAmbientBackgroundProps {
  theme: DashboardAmbientTheme;
}

const themeBaseClass: Record<DashboardAmbientTheme, string> = {
  recruitment: "dashboard-ambient-base dashboard-ambient-base--recruitment",
  positioning: "dashboard-ambient-base dashboard-ambient-base--positioning",
  general: "dashboard-ambient-base dashboard-ambient-base--general",
  dovrut: "dashboard-ambient-base dashboard-ambient-base--dovrut",
};

export function DashboardAmbientBackground({ theme }: DashboardAmbientBackgroundProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={`${themeBaseClass[theme]} absolute inset-0`} />
    </div>
  );
}
