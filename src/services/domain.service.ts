import { BaseService } from "@/services/base.service";
import { Domain, Subtopic } from "@/types/models";

export class DomainService extends BaseService {
  public async getDomains(): Promise<Domain[]> {
    const db = this.getDb();
    const data = await db<Domain[]>`select id, name, slug from domains order by name`;
    return data;
  }

  public async getSubtopicsByDomain(domainId: string): Promise<Subtopic[]> {
    const db = this.getDb();
    const data =
      await db<Subtopic[]>`select id, name, domain_id from subtopics where domain_id = ${domainId} order by name`;
    return data;
  }
}
