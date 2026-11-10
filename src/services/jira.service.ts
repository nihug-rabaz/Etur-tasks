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
    return exact?.accountId ?? users[0]?.accountId ?? null;
  }

  public async resolveKobiAccountId(): Promise<string | null> {
    const fromEnv = Env.get("JIRA_KOBI_ACCOUNT_ID")?.trim();
    if (fromEnv) return fromEnv;
    const email = Env.get("JIRA_KOBI_EMAIL")?.trim();
    if (!email) return null;
    return this.resolveAccountIdByEmail(email);
  }

  public async resolveLiadAccountId(): Promise<string> {
    const fromEnv = Env.get("JIRA_LIAD_ACCOUNT_ID")?.trim();
    if (fromEnv) return fromEnv;
    const email = Env.get("JIRA_LIAD_EMAIL")?.trim();
    if (email) {
      const id = await this.resolveAccountIdByEmail(email);
      if (id) return id;
    }
    throw new Error("Missing JIRA_LIAD_ACCOUNT_ID / JIRA_LIAD_EMAIL");
  }

  public async resolveZoharAccountId(): Promise<string> {
    const fromEnv = Env.get("JIRA_ZOHAR_ACCOUNT_ID")?.trim();
    if (fromEnv) return fromEnv;
    const email = Env.get("JIRA_ZOHAR_EMAIL")?.trim();
    if (email) {
      const id = await this.resolveAccountIdByEmail(email);
      if (id) return id;
    }
    throw new Error("Missing JIRA_ZOHAR_ACCOUNT_ID / JIRA_ZOHAR_EMAIL");
  }

  public async createDevFeedbackIssue(input: {
    summary: string;
    descriptionLines: string[];
    moduleId: string;
    assigneeAccountId?: string | null;
  }): Promise<{
    key: string;
    id: string;
    browseUrl: string;
    assignedToKobi: boolean;
  }> {
    const labels = [
      LABEL_DEV_FEEDBACK,
      LABEL_AWAITING_KOBI,
      `module-${input.moduleId}`,
    ];

    const baseFields: Record<string, unknown> = {
      project: { key: this.projectKey() },
      summary: input.summary.slice(0, 250),
      issuetype: { name: "Task" },
      labels,
      description: adfDoc(input.descriptionLines),
    };

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
    let assignedToKobi = false;
    if (input.assigneeAccountId) {
      try {
        created = await tryCreate(true);
        assignedToKobi = true;
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
      assignedToKobi,
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
