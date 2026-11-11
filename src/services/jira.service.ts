import { Env } from "@/lib/env";
import {
  LABEL_APPROVED,
  LABEL_AWAITING_KOBI,
  LABEL_DEV_FEEDBACK,
  LABEL_REJECTED,
  parseModuleIdFromLabels,
} from "@/modules/dev-feedback/constants";

type JiraUser = {
  accountId: string;
  displayName?: string;
  emailAddress?: string;
};

type JiraIssueCreateResponse = {
  id: string;
  key: string;
  self: string;
};

export type JiraPendingIssue = {
  key: string;
  id: string;
  summary: string;
  moduleId: string | null;
  created: string | null;
  reporterName: string | null;
  browseUrl: string;
};

function adfDoc(paragraphs: string[]): Record<string, unknown> {
  return {
    type: "doc",
    version: 1,
    content: paragraphs
      .filter((p) => p.trim().length > 0)
      .map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      })),
  };
}

export class JiraService {
  private baseUrl(): string {
    return (Env.require("JIRA_BASE_URL") || "").replace(/\/$/, "");
  }

  private projectKey(): string {
    return Env.get("JIRA_PROJECT_KEY") || "ETUR";
  }

  private authHeader(): string {
    const email = Env.require("JIRA_EMAIL");
    const token = Env.require("JIRA_API_TOKEN");
    const encoded = Buffer.from(`${email}:${token}`).toString("base64");
    return `Basic ${encoded}`;
  }

  private browseUrl(issueKey: string): string {
    return `${this.baseUrl()}/browse/${issueKey}`;
  }

  private async request<T>(
    path: string,
    init?: RequestInit & { formData?: FormData },
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", this.authHeader());
    if (!init?.formData) {
      headers.set("Accept", "application/json");
      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    } else {
      headers.set("X-Atlassian-Token", "no-check");
      headers.set("Accept", "application/json");
    }

    const response = await fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers,
      body: init?.formData ?? init?.body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Jira ${init?.method || "GET"} ${path} failed (${response.status}): ${text.slice(0, 500)}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  public async resolveAccountIdByEmail(email: string): Promise<string | null> {
    const query = email.trim();
    if (!query) return null;
    const users = await this.request<JiraUser[]>(
      `/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=10`,
    );
    const exact = users.find(
      (u) => (u.emailAddress || "").toLowerCase() === query.toLowerCase(),
    );
    return exact?.accountId ?? null;
  }

  /** Match users by display-name tokens (emails are often hidden in Jira Cloud). */
  public async resolveAccountIdByNameHints(
    hints: string[],
  ): Promise<string | null> {
    for (const hint of hints) {
      const query = hint.trim();
      if (!query) continue;
      const users = await this.request<JiraUser[]>(
        `/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=20`,
      );
      const lowered = query.toLowerCase();
      const hit = users.find((u) => {
        const name = (u.displayName || "").toLowerCase();
        return (
          name === lowered ||
          name.includes(lowered) ||
          lowered.split(/\s+/).every((part) => part && name.includes(part))
        );
      });
      if (hit?.accountId) return hit.accountId;
    }
    return null;
  }

  /** Jira ADMIN connected via API token (admin@rabaz-idf.com). */
  public async resolveAdminAccountId(): Promise<string> {
    const fromEnv = Env.get("JIRA_ADMIN_ACCOUNT_ID")?.trim();
    if (fromEnv) return fromEnv;
    const me = await this.request<JiraUser>("/rest/api/3/myself");
    if (me.accountId) return me.accountId;
    throw new Error("Cannot resolve Jira ADMIN accountId");
  }

  public async resolveKobiAccountId(): Promise<string | null> {
    const fromEnv = Env.get("JIRA_KOBI_ACCOUNT_ID")?.trim();
    if (fromEnv) return fromEnv;
    const email = Env.get("JIRA_KOBI_EMAIL")?.trim();
    if (email) {
      const byEmail = await this.resolveAccountIdByEmail(email);
      if (byEmail) return byEmail;
    }
    return this.resolveAccountIdByNameHints([
      "koby",
      "kobi",
      "klein",
      "קובי",
      "קליין",
    ]);
  }

  public async resolveLiadAccountId(): Promise<string> {
    const fromEnv = Env.get("JIRA_LIAD_ACCOUNT_ID")?.trim();
    if (fromEnv) return fromEnv;
    const email = Env.get("JIRA_LIAD_EMAIL")?.trim();
    if (email) {
      const byEmail = await this.resolveAccountIdByEmail(email);
      if (byEmail) return byEmail;
    }
    const byName = await this.resolveAccountIdByNameHints([
      "liad kadosh",
      "liad",
      "kadosh",
      "ליעד",
    ]);
    if (byName) return byName;
    // Known ETUR assignable account (liad kadosh)
    return "712020:423fc856-05e6-48e4-ad63-98f3f49a3b8e";
  }

  public async resolveZoharAccountId(): Promise<string> {
    const fromEnv = Env.get("JIRA_ZOHAR_ACCOUNT_ID")?.trim();
    if (fromEnv) return fromEnv;
    const email = Env.get("JIRA_ZOHAR_EMAIL")?.trim();
    if (email) {
      const byEmail = await this.resolveAccountIdByEmail(email);
      if (byEmail) return byEmail;
    }
    const byName = await this.resolveAccountIdByNameHints([
      "zohar tkacz",
      "zohar",
      "tkacz",
      "זוהר",
    ]);
    if (byName) return byName;
    // Known ETUR assignable account (zohar tkacz)
    return "712020:558455f2-4d17-4ca1-9451-7b4d0ee26785";
  }

  public async createDevFeedbackIssue(input: {
    summary: string;
    descriptionLines: string[];
    moduleId: string;
    /** Prefer Jira ADMIN so tickets open under the connected admin user. */
    assigneeAccountId?: string | null;
    /**
     * When false (default true historically): create as already approved for
     * development — no awaiting-kobi label; optional due date.
     */
    awaitingKobi?: boolean;
    dueDateIso?: string | null;
    approved?: boolean;
  }): Promise<{
    key: string;
    id: string;
    browseUrl: string;
    assignedToAdmin: boolean;
  }> {
    const awaiting = input.awaitingKobi === true;
    const labels = [
      LABEL_DEV_FEEDBACK,
      ...(awaiting ? [LABEL_AWAITING_KOBI] : [LABEL_APPROVED]),
      `module-${input.moduleId}`,
    ];

    const baseFields: Record<string, unknown> = {
      project: { key: this.projectKey() },
      summary: input.summary.slice(0, 250),
      issuetype: { name: "Task" },
      labels,
      description: adfDoc(input.descriptionLines),
    };
    if (input.dueDateIso) {
      baseFields.duedate = input.dueDateIso;
    }

    const tryCreate = async (withAssignee: boolean) => {
      const fields = { ...baseFields };
      if (withAssignee && input.assigneeAccountId) {
        fields.assignee = { id: input.assigneeAccountId };
      }
      return this.request<JiraIssueCreateResponse>("/rest/api/3/issue", {
        method: "POST",
        body: JSON.stringify({ fields }),
      });
    };

    let created: JiraIssueCreateResponse;
    let assignedToAdmin = false;
    if (input.assigneeAccountId) {
      try {
        created = await tryCreate(true);
        assignedToAdmin = true;
      } catch (error) {
        console.warn(
          "[jira-create] assignee failed; retrying without assignee",
          error,
        );
        created = await tryCreate(false);
      }
    } else {
      created = await tryCreate(false);
    }

    return {
      key: created.key,
      id: created.id,
      browseUrl: this.browseUrl(created.key),
      assignedToAdmin,
    };
  }

  public async assertAwaitingKobi(issueKey: string): Promise<string[]> {
    const issue = await this.request<{
      fields: { labels?: string[]; project?: { key?: string } };
    }>(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=labels,project`,
    );
    const labels = issue.fields.labels ?? [];
    const projectKey = issue.fields.project?.key;
    if (projectKey && projectKey !== this.projectKey()) {
      throw new Error("המשימה אינה בפרויקט ETUR");
    }
    if (!labels.includes(LABEL_AWAITING_KOBI)) {
      throw new Error("המשימה אינה ממתינה לאישור הרב קובי");
    }
    return labels;
  }

  public async addAttachment(
    issueKey: string,
    file: Blob,
    filename: string,
  ): Promise<void> {
    const formData = new FormData();
    formData.append("file", file, filename);
    await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/attachments`, {
      method: "POST",
      formData,
    });
  }

  public async addComment(issueKey: string, text: string): Promise<void> {
    await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      method: "POST",
      body: JSON.stringify({ body: adfDoc([text]) }),
    });
  }

  public async listAwaitingKobiApproval(): Promise<JiraPendingIssue[]> {
    const jql = `project = ${this.projectKey()} AND labels = "${LABEL_AWAITING_KOBI}" ORDER BY created DESC`;
    const result = await this.request<{
      issues: Array<{
        id: string;
        key: string;
        fields: {
          summary?: string;
          created?: string;
          labels?: string[];
          reporter?: { displayName?: string };
        };
      }>;
    }>("/rest/api/3/search/jql", {
      method: "POST",
      body: JSON.stringify({
        jql,
        maxResults: 50,
        fields: ["summary", "created", "labels", "reporter"],
      }),
    });

    return (result.issues || []).map((issue) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary || issue.key,
      moduleId: parseModuleIdFromLabels(issue.fields.labels),
      created: issue.fields.created ?? null,
      reporterName: issue.fields.reporter?.displayName ?? null,
      browseUrl: this.browseUrl(issue.key),
    }));
  }

  public async getIssueLabels(issueKey: string): Promise<string[]> {
    const issue = await this.request<{
      fields: { labels?: string[] };
    }>(`/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=labels`);
    return issue.fields.labels ?? [];
  }

  public async approveForDev(input: {
    issueKey: string;
    targetAssigneeAccountId: string;
    dueDateIso: string;
    comment: string;
  }): Promise<void> {
    const labels = await this.assertAwaitingKobi(input.issueKey);
    const nextLabels = Array.from(
      new Set([
        ...labels.filter(
          (l) => l !== LABEL_AWAITING_KOBI && l !== LABEL_REJECTED,
        ),
        LABEL_DEV_FEEDBACK,
        LABEL_APPROVED,
      ]),
    );

    await this.request(`/rest/api/3/issue/${encodeURIComponent(input.issueKey)}`, {
      method: "PUT",
      body: JSON.stringify({
        fields: {
          assignee: { id: input.targetAssigneeAccountId },
          duedate: input.dueDateIso,
          labels: nextLabels,
        },
      }),
    });

    await this.addComment(input.issueKey, input.comment);
  }

  public async rejectDevFeedback(input: {
    issueKey: string;
    comment: string;
  }): Promise<void> {
    const labels = await this.assertAwaitingKobi(input.issueKey);
    const nextLabels = Array.from(
      new Set([
        ...labels.filter((l) => l !== LABEL_AWAITING_KOBI),
        LABEL_DEV_FEEDBACK,
        LABEL_REJECTED,
      ]),
    );

    await this.request(`/rest/api/3/issue/${encodeURIComponent(input.issueKey)}`, {
      method: "PUT",
      body: JSON.stringify({
        fields: { labels: nextLabels },
      }),
    });

    await this.addComment(input.issueKey, input.comment);
  }
}
