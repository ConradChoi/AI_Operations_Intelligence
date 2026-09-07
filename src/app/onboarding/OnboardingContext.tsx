'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface ParsedRow {
  [key: string]: string;
}

export interface MappingEntry {
  header: string;
  field: string | null;
}

interface OnboardingState {
  organizationId: string | null;
  projectId: string | null;
  file: File | null;
  headers: string[];
  rows: ParsedRow[];
  mapping: MappingEntry[];
  setWorkspace: (organizationId: string, projectId: string) => void;
  setUpload: (file: File, headers: string[], rows: ParsedRow[]) => void;
  setMapping: (mapping: MappingEntry[]) => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMappingState] = useState<MappingEntry[]>([]);

  const value: OnboardingState = {
    organizationId,
    projectId,
    file,
    headers,
    rows,
    mapping,
    setWorkspace: (orgId, projId) => {
      setOrganizationId(orgId);
      setProjectId(projId);
    },
    setUpload: (f, hdrs, parsedRows) => {
      setFile(f);
      setHeaders(hdrs);
      setRows(parsedRows);
    },
    setMapping: (m) => setMappingState(m),
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
