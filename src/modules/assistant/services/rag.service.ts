import {
  agamKnowledge,
  dovrutKnowledge,
  malshabimKnowledge,
  nagadimKnowledge,
  platformKnowledge,
  tasksKnowledge,
} from "@/modules/assistant/knowledge/corpus";

type KnowledgeDoc = {
  id: string;
  title: string;
  body: string;
  tokens: string[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function toDoc(id: string, body: string): KnowledgeDoc {
  const titleLine = body.split(/\r?\n/).find((l) => l.trim().startsWith("#"));
  const title = titleLine?.replace(/^#+\s*/, "").trim() || id;
  return {
    id,
    title,
    body,
    tokens: tokenize(`${title}\n${body}`),
  };
}

const DOCS: KnowledgeDoc[] = [
  toDoc("platform", platformKnowledge),
  toDoc("tasks", tasksKnowledge),
  toDoc("dovrut", dovrutKnowledge),
  toDoc("agam", agamKnowledge),
  toDoc("malshabim", malshabimKnowledge),
  toDoc("nagadim", nagadimKnowledge),
];

export class AssistantRagService {
  public search(query: string, limit = 3): Array<{ id: string; title: string; excerpt: string }> {
    const qTokens = tokenize(query);
    if (qTokens.length === 0) {
      return DOCS.slice(0, limit).map((d) => ({
        id: d.id,
        title: d.title,
        excerpt: d.body.slice(0, 900),
      }));
    }

    const scored = DOCS.map((doc) => {
      let score = 0;
      for (const token of qTokens) {
        if (doc.tokens.includes(token)) score += 2;
        if (doc.id.includes(token)) score += 3;
        if (doc.title.toLowerCase().includes(token)) score += 2;
      }
      return { doc, score };
    })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const picked = scored.length > 0 ? scored : DOCS.slice(0, limit).map((doc) => ({ doc, score: 0 }));
    return picked.map(({ doc }) => ({
      id: doc.id,
      title: doc.title,
      excerpt: doc.body.slice(0, 1200),
    }));
  }

  public getById(id: string): { id: string; title: string; body: string } | null {
    const doc = DOCS.find((d) => d.id === id || d.id.includes(id));
    if (!doc) return null;
    return { id: doc.id, title: doc.title, body: doc.body.slice(0, 2500) };
  }

  public formatSnippets(query: string, limit = 3): string {
    const hits = this.search(query, limit);
    if (hits.length === 0) return "";
    return hits.map((h) => `### ${h.title}\n${h.excerpt}`).join("\n\n");
  }
}
