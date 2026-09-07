export type FinalizeUploadResult =
  | { ok: true; organizationId: string; datasetId: string; opportunitiesCount: number }
  | { ok: false; error: string };
