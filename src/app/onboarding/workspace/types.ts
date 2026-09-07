export type CreateWorkspaceResult =
  | { ok: true; organizationId: string; projectId: string }
  | { ok: false; error: string };
