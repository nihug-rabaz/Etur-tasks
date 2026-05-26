import { TabSectionItem } from "@/services/dashboard.service";
import { ProjectExpandableCard } from "@/components/main-tabs/project-expandable-card";
import { domainMeta, type DomainKey } from "@/lib/ui/domains";

interface SectionGroupProps {
  section: TabSectionItem;
  domainSlug: DomainKey;
  toneClass: string;
  onTaskClick: (task: { id: string; title: string }) => void;
}

export function SectionGroup({ section, domainSlug, toneClass, onTaskClick }: SectionGroupProps) {
  const domain = domainMeta[domainSlug];

  return (
    <section className={`flex h-fit w-full flex-col self-start overflow-hidden rounded-2xl border-2 ${domain.shell}`}>
      <div className={`flex items-center justify-between gap-2 px-4 py-3 ${domain.header}`}>
        <h3 className="text-lg font-bold text-white">{section.name}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${domain.headerPill}`}>
          {section.projects.length} פרויקטים
        </span>
      </div>

      <div className={`flex flex-1 flex-col gap-3 p-3 ${domain.body}`}>
        {section.projects.length === 0 ? (
          <p className={`rounded-xl border-2 px-4 py-6 text-center text-sm font-medium ${domain.metaPanel}`}>
            אין פרויקטים להצגה בסקציה זו.
          </p>
        ) : (
          section.projects.map((project) => (
            <ProjectExpandableCard
              key={project.id}
              project={project}
              toneClass={toneClass}
              onTaskClick={onTaskClick}
            />
          ))
        )}
      </div>
    </section>
  );
}
