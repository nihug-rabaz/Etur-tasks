import { TabSectionItem } from "@/services/dashboard.service";
import { ProjectExpandableCard } from "@/components/main-tabs/project-expandable-card";
import { StandaloneTasksList } from "@/components/main-tabs/standalone-tasks-card";
import { domainMeta, type DomainKey } from "@/lib/ui/domains";

interface SectionGroupProps {
  section: TabSectionItem;
  domainSlug: DomainKey;
  toneClass: string;
  onTaskClick: (task: { id: string; title: string }) => void;
}

const domainHeaderColors: Record<DomainKey, string> = {
  recruitment: "#22b8cf",
  positioning: "#fb923c",
  general: "#8b5cf6",
};

export function SectionGroup({ section, domainSlug, toneClass, onTaskClick }: SectionGroupProps) {
  const domain = domainMeta[domainSlug];
  const hasContent = section.projects.length > 0 || section.standaloneTasks.length > 0;

  return (
    <section className="surface-card flex h-fit w-full flex-col self-start overflow-hidden">
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ backgroundColor: domainHeaderColors[domainSlug] }}
      >
        <h3 className="text-lg font-bold text-white">{section.name}</h3>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
        >
          {section.projects.length} פרויקטים
          {section.standaloneTasks.length > 0 ? ` · ${section.standaloneTasks.length} משימות` : ""}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {!hasContent ? (
          <p className={`rounded-xl px-4 py-6 text-center text-sm font-medium ${domain.metaPanel}`}>
            אין פרויקטים או משימות להצגה בסקציה זו.
          </p>
        ) : (
          <>
            {section.standaloneTasks.length > 0 ? (
              <StandaloneTasksList
                sectionId={section.id}
                tasks={section.standaloneTasks}
                onTaskClick={onTaskClick}
              />
            ) : null}
            {section.projects.map((project) => (
              <ProjectExpandableCard
                key={`${section.id}-${project.id}`}
                project={project}
                toneClass={toneClass}
                onTaskClick={onTaskClick}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
}
