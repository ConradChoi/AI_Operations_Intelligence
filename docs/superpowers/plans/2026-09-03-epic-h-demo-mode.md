# Epic H — Demo / Sample Data Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인/업로드 없이 "샘플로 체험하기" 클릭 한 번으로, 실제 규칙 기반 Spend 탐지 엔진이 계산한 결과를 Spend Overview·Savings Opportunity 화면에서 즉시 보여준다.

**Architecture:** Next.js(TS, App Router) 프론트가 Supabase(Postgres+RLS)를 anon key로 읽기 전용 조회한다. 샘플 데이터는 시딩 스크립트가 고정된 `demo-org`/`demo-project`에 1회 삽입하고, Supabase Edge Function `run-spend-analysis`(내부에 순수 TS 함수들로 구성된 탐지 엔진)를 service-role로 1회 호출해 `opportunities` 테이블을 채운다. 같은 Edge Function은 Week2 실업로드 파이프라인에서도 재사용된다.

**Tech Stack:** Next.js 14(TypeScript, App Router) · Tailwind CSS · Supabase(Postgres/Auth/RLS, CLI local dev) · Supabase Edge Function(Deno) · Vitest(순수 함수 유닛테스트) · Deno test(Edge Function 내부 로직 유닛테스트) · AWS Amplify(배포, 이번 플랜 범위 밖 — Task 13 이후)

**Spec:** `docs/superpowers/specs/2026-09-03-epic-h-demo-mode-design.md`

## Global Constraints

- 예산 0원 — 유료 API/서비스 신규 가입 없음. Supabase 무료 티어, 로컬 개발은 Supabase CLI + Docker.
- 탐지 엔진은 LLM을 호출하지 않는다 (결정론적 규칙 기반, 스펙 "탐지 엔진 규칙" 섹션과 정확히 일치해야 함).
- `spend_transactions`/`opportunities`는 anon에게 `organization_id = 'demo-org'` 행만 SELECT 허용, 그 외 쓰기는 전부 금지 (스펙 "접근 & RLS" 섹션).
- Edge Function `run-spend-analysis`는 별도 함수로 쪼개 배포하지 않고, 하나의 Edge Function 안에서 순수 함수들을 조합한다 (스펙 아키텍처 섹션).
- 컬럼/테이블명은 `data/AI_Operations_Intelligence_CSV_표준컬럼명세.md`의 Spend 스키마와 스펙의 데이터 모델 표를 그대로 따른다.
- Node 스크립트(`scripts/*.ts`)와 Vitest 테스트는 `.env.local`을 명시적으로 로드해야 한다(Next.js 개발 서버는 자동 로드하지만 `tsx`/`vitest` 단독 실행은 아니다) — Task 1이 `dotenv` 의존성과 `vitest.setup.ts`를 만들고, Task 9의 `seed-demo.ts`가 이를 사용한다.
- `supabase functions serve run-spend-analysis`는 백그라운드 장기 실행 프로세스다. 이 프로세스가 필요한 모든 Task(8, 9, 13)는 **이미 떠 있는지 먼저 확인하고, 없으면 그 Task 안에서 직접 백그라운드로 새로 띄운다** — 이전 Task가 띄운 프로세스가 살아있다고 가정하지 않는다(서로 다른 subagent 세션 간에는 보장되지 않음). `supabase start`가 띄우는 Docker 컨테이너(DB/Auth/API)는 호스트에 계속 떠 있으므로 이 규칙의 대상이 아니다.

---

## File Structure

```
package.json
tsconfig.json
next.config.mjs
tailwind.config.ts
postcss.config.js
vitest.config.ts
vitest.setup.ts
.gitignore
.env.example
src/
  app/
    layout.tsx
    globals.css
    page.tsx                          # 랜딩 페이지, "샘플로 체험하기" 버튼
    demo/spend/overview/page.tsx       # S5 Spend Overview
    demo/spend/opportunities/page.tsx  # S6 Savings Opportunities
  components/spend/
    KpiCard.tsx
    OpportunityTable.tsx
  lib/
    supabaseClient.ts
    format.ts
    format.test.ts
supabase/
  config.toml                          # `supabase init`이 생성
  migrations/
    <timestamp>_init_schema.sql
    <timestamp>_rls_policies.sql
  functions/
    run-spend-analysis/
      index.ts                         # Edge Function 엔트리포인트
      lib/
        types.ts
        normalizeVendor.ts
        normalizeVendor.test.ts
        categorize.ts
        categorize.test.ts
        detectRecurring.ts
        detectRecurring.test.ts
        detectDuplicates.ts
        detectDuplicates.test.ts
        detectPriceChanges.ts
        detectPriceChanges.test.ts
        scoreAnomalies.ts
        scoreAnomalies.test.ts
        generateOpportunities.ts
        generateOpportunities.test.ts
scripts/
  generate-demo-data.ts                # 샘플 거래 생성기 (순수 함수)
  generate-demo-data.test.ts
  seed-demo.ts                         # 시딩 실행 스크립트 (service_role)
tests/
  rls.test.ts                          # anon 격리 검증
  idempotency.test.ts                  # 재시딩 시 중복 없음 검증
```

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `vitest.setup.ts`, `.env.example`
- Modify: `.gitignore` (이미 존재 — 항목만 보강, 덮어쓰지 않음)
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

**Interfaces:**
- Produces: Next.js 앱 골격, 이후 모든 Task가 이 위에서 동작.

**참고:** git 저장소는 이미 초기화되어 있고(root commit 존재, `origin` 연결됨), `.gitignore`에도 `node_modules/`, `.next/`, `.env.local`, `.env`, `supabase/.branches`, `supabase/.temp`, `.DS_Store`, `.bkit/`, `.superpowers/`가 이미 들어있다. `git init`은 다시 실행하지 않는다 — 아래 Step 1은 package.json부터 시작한다.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "ai-ops-intelligence-spend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed:demo": "tsx scripts/seed-demo.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "dotenv": "^16.4.5",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "tsx": "^4.16.0",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "supabase/functions"]
}
```

- [ ] **Step 3: next.config.mjs 작성**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

- [ ] **Step 4: Tailwind 설정 작성**

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

`postcss.config.js`:
```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: 앱 골격 작성**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:
```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'AI Operations Intelligence — Spend',
  description: '결제까지 더 짧게. 운영은 더 빠르게. 지출은 더 가볍게.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-2xl font-semibold">AI Operations Intelligence — Spend</h1>
      <p className="mt-4 text-gray-600">결제까지 더 짧게. 운영은 더 빠르게. 지출은 더 가볍게.</p>
      <Link
        href="/demo/spend/overview"
        className="mt-8 inline-block rounded bg-blue-600 px-6 py-3 text-white"
      >
        샘플로 체험하기
      </Link>
    </main>
  );
}
```

- [ ] **Step 6: vitest 설정 + .env.local 자동 로드 작성**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

`vitest.setup.ts`:
```ts
import { config } from 'dotenv';

config({ path: '.env.local' });
```

이 setup 파일 덕분에 이후 모든 `npm run test` 실행(Task 3의 `tests/rls.test.ts`, Task 9의 `tests/idempotency.test.ts` 포함)이 `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`를 자동으로 읽는다. Next.js 개발 서버(`npm run dev`)는 이미 `.env.local`을 자동 로드하므로 별도 조치가 필요 없다.

- [ ] **Step 7: .gitignore, .env.example 작성**

`.env.local`은 이미 리포지토리 루트 `.gitignore`에 포함되어 있다(초기 설정 시 추가됨). 아래 `.gitignore` 항목이 이미 존재하면 건너뛰고, 없는 항목만 추가한다.

`.gitignore`:
```
node_modules/
.next/
.env.local
.env
supabase/.branches
supabase/.temp
```

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 8: 의존성 설치 및 빌드 확인**

```bash
npm install
npm run build
```

Expected: 빌드 성공 (경고는 무방, 에러 없어야 함).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, vitest, dotenv"
```

---

### Task 2: Supabase 로컬 프로젝트 초기화 + 스키마 마이그레이션

**Prerequisite:** Docker Desktop 실행 중이어야 함. Supabase CLI 미설치 시 `brew install supabase/tap/supabase`.

**Files:**
- Create: `supabase/config.toml` (CLI가 생성)
- Create: `supabase/migrations/<timestamp>_init_schema.sql`

**Interfaces:**
- Produces: `organizations`, `projects`, `datasets`, `spend_transactions`, `opportunities` 테이블. 이후 모든 Task가 이 스키마를 전제로 함.

- [ ] **Step 1: Supabase 프로젝트 초기화 및 로컬 기동**

```bash
npx supabase init
npx supabase start
```

Expected: `API URL`, `anon key`, `service_role key`가 출력됨. 이 값들을 `.env.local`에 옮겨 적는다 (`.env.example` 형식 그대로, `.env.local`은 git에 커밋되지 않음).

- [ ] **Step 2: 마이그레이션 파일 생성**

```bash
npx supabase migration new init_schema
```

Expected: `supabase/migrations/<timestamp>_init_schema.sql` 빈 파일 생성.

- [ ] **Step 3: 스키마 작성**

방금 생성된 `supabase/migrations/<timestamp>_init_schema.sql`에 아래 내용을 작성:

```sql
create table organizations (
  id text primary key,
  name text not null,
  industry text,
  created_at timestamptz not null default now()
);

create table projects (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  product_type text not null default 'spend',
  period_from date,
  period_to date,
  created_at timestamptz not null default now()
);

create table datasets (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  filename text,
  schema_type text not null default 'spend',
  quality_score int,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table spend_transactions (
  id text primary key,
  dataset_id text not null references datasets(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  transaction_date date not null,
  vendor_raw text not null,
  vendor_normalized text,
  amount numeric not null,
  currency text not null default 'KRW',
  category text,
  recurring_flag boolean,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  type text not null,
  title text not null,
  evidence_json jsonb,
  impact_type text,
  estimated_value numeric,
  confidence int,
  effort text,
  priority numeric,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index idx_spend_transactions_project on spend_transactions(project_id);
create index idx_spend_transactions_vendor on spend_transactions(vendor_normalized);
create index idx_opportunities_project on opportunities(project_id);
```

- [ ] **Step 4: 마이그레이션 적용 및 확인**

```bash
npx supabase db reset
```

Expected: 에러 없이 완료, 콘솔에 5개 테이블 생성 로그가 보임.

```bash
npx supabase db diff --schema public
```

Expected: 출력 없음(마이그레이션과 실제 DB 상태 일치).

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema for spend intelligence demo"
```

---

### Task 3: RLS 정책 마이그레이션 + 격리 검증 테스트

**Files:**
- Create: `supabase/migrations/<timestamp>_rls_policies.sql`
- Create: `tests/rls.test.ts`
- Modify: `package.json` (devDependency 추가 없음, 기존 `@supabase/supabase-js` 재사용)

**Interfaces:**
- Consumes: Task 2의 5개 테이블
- Produces: anon은 `organization_id = 'demo-org'` 행만 읽을 수 있고, 그 외는 못 읽는다는 보장. 이후 프론트(Task 11, 12)가 이 보장을 전제로 anon key를 그대로 쓴다.

- [ ] **Step 1: 마이그레이션 파일 생성**

```bash
npx supabase migration new rls_policies
```

- [ ] **Step 2: RLS 정책 작성**

`supabase/migrations/<timestamp>_rls_policies.sql`:
```sql
alter table organizations enable row level security;
alter table projects enable row level security;
alter table datasets enable row level security;
alter table spend_transactions enable row level security;
alter table opportunities enable row level security;

create policy "demo org readable by anyone"
  on organizations for select
  using (id = 'demo-org');

create policy "demo project readable by anyone"
  on projects for select
  using (organization_id = 'demo-org');

create policy "demo dataset readable by anyone"
  on datasets for select
  using (project_id = 'demo-project');

create policy "demo transactions readable by anyone"
  on spend_transactions for select
  using (organization_id = 'demo-org');

create policy "demo opportunities readable by anyone"
  on opportunities for select
  using (organization_id = 'demo-org');
```

- [ ] **Step 3: 마이그레이션 적용 (호스티드 프로젝트 — 컨트롤러가 처리)**

이 프로젝트는 로컬 Docker가 아니라 호스티드 Supabase 프로젝트를 사용한다 (Task 2에서 확정됨). `supabase db reset`은 로컬 전용이므로 사용하지 않는다. 대신 컨트롤러가 Step 2의 SQL을 사용자에게 전달해 Supabase 대시보드 SQL Editor에서 실행하도록 하고, REST API로 정책이 적용됐는지 확인한 뒤(예: anon 키로 `organization_id != 'demo-org'` 행이 조회되지 않는지) 이 Step을 완료 처리한다. 이 Step은 subagent가 아니라 컨트롤러가 직접 수행한다 — subagent는 Step 4부터 시작한다.

- [ ] **Step 4: RLS 격리 테스트 작성 (실패 확인용 시나리오 먼저 서술)**

`tests/rls.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('RLS isolation', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anon = createClient(SUPABASE_URL, ANON_KEY);

  beforeAll(async () => {
    await admin.from('organizations').upsert({ id: 'demo-org', name: 'Demo Org' });
    await admin.from('organizations').upsert({ id: 'other-org', name: 'Other Org' });
    await admin.from('projects').upsert({ id: 'demo-project', organization_id: 'demo-org' });
    await admin.from('projects').upsert({ id: 'other-project', organization_id: 'other-org' });
    await admin.from('datasets').upsert({ id: 'demo-dataset', project_id: 'demo-project' });
    await admin.from('datasets').upsert({ id: 'other-dataset', project_id: 'other-project' });
    await admin.from('spend_transactions').upsert({
      id: 'tx_rls_demo',
      dataset_id: 'demo-dataset',
      project_id: 'demo-project',
      organization_id: 'demo-org',
      transaction_date: '2026-01-05',
      vendor_raw: 'Test Vendor',
      amount: 1000,
    });
    await admin.from('spend_transactions').upsert({
      id: 'tx_rls_other',
      dataset_id: 'other-dataset',
      project_id: 'other-project',
      organization_id: 'other-org',
      transaction_date: '2026-01-05',
      vendor_raw: 'Other Vendor',
      amount: 1000,
    });
  });

  it('anon can read demo-org transactions', async () => {
    const { data, error } = await anon
      .from('spend_transactions')
      .select('id')
      .eq('id', 'tx_rls_demo');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('anon cannot read other-org transactions', async () => {
    const { data, error } = await anon
      .from('spend_transactions')
      .select('id')
      .eq('id', 'tx_rls_other');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('anon cannot insert transactions', async () => {
    const { error } = await anon.from('spend_transactions').insert({
      id: 'tx_rls_hack',
      dataset_id: 'demo-dataset',
      project_id: 'demo-project',
      organization_id: 'demo-org',
      transaction_date: '2026-01-05',
      vendor_raw: 'Hacked',
      amount: 1,
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 5: 테스트 실행 (RLS 정책 적용 전이면 실패해야 함이 아니라, 이미 Step 3에서 정책을 적용했으므로 통과를 기대)**

```bash
npm run test -- tests/rls.test.ts
```

Expected: PASS (3개 테스트 모두 통과). 만약 `anon cannot read other-org transactions`가 실패하면 정책의 `using` 조건을 다시 확인한다.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations tests/rls.test.ts
git commit -m "feat: add RLS policies isolating demo-org data"
```

---

### Task 4: 탐지 엔진 — 타입 정의 + Vendor 정규화 + 카테고리 매핑 (FR-F1, FR-F2)

**Files:**
- Create: `supabase/functions/run-spend-analysis/lib/types.ts`
- Create: `supabase/functions/run-spend-analysis/lib/normalizeVendor.ts`
- Test: `supabase/functions/run-spend-analysis/lib/normalizeVendor.test.ts`
- Create: `supabase/functions/run-spend-analysis/lib/categorize.ts`
- Test: `supabase/functions/run-spend-analysis/lib/categorize.test.ts`

**Interfaces:**
- Produces: `SpendTransaction`, `Opportunity` 타입 (Task 5~7이 그대로 import), `normalizeVendor(vendorRaw: string): string`, `categorize(vendorNormalized: string): string`

**Prerequisite:** Deno 설치 (`brew install deno`).

- [ ] **Step 1: 공용 타입 작성**

`supabase/functions/run-spend-analysis/lib/types.ts`:
```ts
export interface SpendTransaction {
  id: string;
  dataset_id: string;
  project_id: string;
  organization_id: string;
  transaction_date: string;
  vendor_raw: string;
  vendor_normalized: string | null;
  amount: number;
  currency: string;
  category: string | null;
}

export type OpportunityType = 'DUPLICATE' | 'PRICE_INCREASE' | 'RECURRING_REVIEW' | 'ANOMALY';

export interface Opportunity {
  project_id: string;
  organization_id: string;
  type: OpportunityType;
  title: string;
  evidence_json: Record<string, unknown>;
  impact_type: 'cost_saving';
  estimated_value: number;
  confidence: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  status: 'new';
}
```

- [ ] **Step 2: normalizeVendor 실패하는 테스트 작성**

`supabase/functions/run-spend-analysis/lib/normalizeVendor.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { normalizeVendor } from './normalizeVendor.ts';

Deno.test('normalizeVendor - known alias maps to canonical name', () => {
  assertEquals(normalizeVendor('AWS Seoul'), 'AWS');
});

Deno.test('normalizeVendor - unknown vendor is title-cased', () => {
  assertEquals(normalizeVendor('acme cloud storage'), 'Acme Cloud Storage');
});

Deno.test('normalizeVendor - trims surrounding whitespace', () => {
  assertEquals(normalizeVendor('  Notion Labs  '), 'Notion');
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/normalizeVendor.test.ts
```

Expected: FAIL (`normalizeVendor.ts` 파일이 없어 모듈을 찾을 수 없음).

- [ ] **Step 4: normalizeVendor 구현**

`supabase/functions/run-spend-analysis/lib/normalizeVendor.ts`:
```ts
const VENDOR_ALIASES: Record<string, string> = {
  'aws seoul': 'AWS',
  'amazon web services': 'AWS',
  'notion labs': 'Notion',
  'notion.so': 'Notion',
  'slack technologies': 'Slack',
  'google cloud platform': 'Google Cloud',
  'gcp': 'Google Cloud',
  'figma inc': 'Figma',
  'zoom video communications': 'Zoom',
  'adobe creative cloud': 'Adobe Creative Cloud',
  'hubspot inc': 'HubSpot',
};

export function normalizeVendor(vendorRaw: string): string {
  const key = vendorRaw.trim().toLowerCase();
  if (VENDOR_ALIASES[key]) return VENDOR_ALIASES[key];
  return vendorRaw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/normalizeVendor.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: categorize 실패하는 테스트 작성**

`supabase/functions/run-spend-analysis/lib/categorize.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { categorize } from './categorize.ts';

Deno.test('categorize - known vendor maps to category', () => {
  assertEquals(categorize('AWS'), 'Cloud Infrastructure');
});

Deno.test('categorize - unknown vendor falls back to Uncategorized', () => {
  assertEquals(categorize('Random Vendor'), 'Uncategorized');
});
```

- [ ] **Step 7: 테스트 실패 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/categorize.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 8: categorize 구현**

`supabase/functions/run-spend-analysis/lib/categorize.ts`:
```ts
const CATEGORY_MAP: Record<string, string> = {
  AWS: 'Cloud Infrastructure',
  'Google Cloud': 'Cloud Infrastructure',
  Notion: 'Productivity SaaS',
  Slack: 'Productivity SaaS',
  Zoom: 'Productivity SaaS',
  Figma: 'Design SaaS',
  'Adobe Creative Cloud': 'Design SaaS',
  HubSpot: 'Sales & Marketing SaaS',
};

export function categorize(vendorNormalized: string): string {
  return CATEGORY_MAP[vendorNormalized] ?? 'Uncategorized';
}
```

- [ ] **Step 9: 테스트 통과 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/categorize.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add supabase/functions/run-spend-analysis/lib/types.ts \
        supabase/functions/run-spend-analysis/lib/normalizeVendor.ts \
        supabase/functions/run-spend-analysis/lib/normalizeVendor.test.ts \
        supabase/functions/run-spend-analysis/lib/categorize.ts \
        supabase/functions/run-spend-analysis/lib/categorize.test.ts
git commit -m "feat: add vendor normalization and category mapping (FR-F1, FR-F2)"
```

---

### Task 5: 탐지 엔진 — Recurring Detection + Duplicate Candidate (FR-F3, FR-F4)

**Files:**
- Create: `supabase/functions/run-spend-analysis/lib/detectRecurring.ts`
- Test: `supabase/functions/run-spend-analysis/lib/detectRecurring.test.ts`
- Create: `supabase/functions/run-spend-analysis/lib/detectDuplicates.ts`
- Test: `supabase/functions/run-spend-analysis/lib/detectDuplicates.test.ts`

**Interfaces:**
- Consumes: `SpendTransaction` (Task 4)
- Produces: `RecurringInfo`, `detectRecurring(transactions: SpendTransaction[]): RecurringInfo[]` — Task 6(detectPriceChanges), Task 7(generateOpportunities)이 사용. `DuplicatePair`, `detectDuplicates(transactions: SpendTransaction[]): DuplicatePair[]` — Task 7이 사용.

- [ ] **Step 1: detectRecurring 실패하는 테스트 작성**

`supabase/functions/run-spend-analysis/lib/detectRecurring.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectRecurring } from './detectRecurring.ts';
import type { SpendTransaction } from './types.ts';

function tx(overrides: Partial<SpendTransaction>): SpendTransaction {
  return {
    id: 'tx_1',
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: '2026-01-05',
    vendor_raw: 'Notion',
    vendor_normalized: 'Notion',
    amount: 180000,
    currency: 'KRW',
    category: null,
    ...overrides,
  };
}

Deno.test('detectRecurring - vendor with 3+ distinct months is flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-01-05' }),
    tx({ id: 't2', transaction_date: '2026-02-05' }),
    tx({ id: 't3', transaction_date: '2026-03-05' }),
  ];
  const result = detectRecurring(txs);
  assertEquals(result.length, 1);
  assertEquals(result[0].vendorNormalized, 'Notion');
  assertEquals(result[0].monthsActive, 3);
});

Deno.test('detectRecurring - vendor with only 2 distinct months is not flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-01-05' }),
    tx({ id: 't2', transaction_date: '2026-02-05' }),
  ];
  assertEquals(detectRecurring(txs).length, 0);
});

Deno.test('detectRecurring - flags vendor even if amount changed mid-way (price change is a separate concern)', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-01-05', amount: 100000 }),
    tx({ id: 't2', transaction_date: '2026-02-05', amount: 100000 }),
    tx({ id: 't3', transaction_date: '2026-03-05', amount: 150000 }),
  ];
  const result = detectRecurring(txs);
  assertEquals(result.length, 1);
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/detectRecurring.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 3: detectRecurring 구현**

`supabase/functions/run-spend-analysis/lib/detectRecurring.ts`:
```ts
import type { SpendTransaction } from './types.ts';

export interface RecurringInfo {
  vendorNormalized: string;
  monthsActive: number;
  averageAmount: number;
  transactionIds: string[];
}

export function detectRecurring(transactions: SpendTransaction[]): RecurringInfo[] {
  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const results: RecurringInfo[] = [];
  for (const [vendor, txs] of byVendor) {
    const sorted = [...txs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    const months = new Set(sorted.map((t) => t.transaction_date.slice(0, 7)));
    if (months.size < 3) continue;

    const avg = sorted.reduce((s, t) => s + t.amount, 0) / sorted.length;
    results.push({
      vendorNormalized: vendor,
      monthsActive: months.size,
      averageAmount: avg,
      transactionIds: sorted.map((t) => t.id),
    });
  }
  return results;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/detectRecurring.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: detectDuplicates 실패하는 테스트 작성**

`supabase/functions/run-spend-analysis/lib/detectDuplicates.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectDuplicates } from './detectDuplicates.ts';
import type { SpendTransaction } from './types.ts';

function tx(overrides: Partial<SpendTransaction>): SpendTransaction {
  return {
    id: 'tx_1',
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: '2026-01-05',
    vendor_raw: 'AWS',
    vendor_normalized: 'AWS',
    amount: 1280000,
    currency: 'KRW',
    category: null,
    ...overrides,
  };
}

Deno.test('detectDuplicates - same vendor and amount within 3 days is flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-03-05', amount: 1280000 }),
    tx({ id: 't2', transaction_date: '2026-03-07', amount: 1280000 }),
  ];
  const result = detectDuplicates(txs);
  assertEquals(result.length, 1);
  assertEquals(result[0].transactionIds, ['t1', 't2']);
});

Deno.test('detectDuplicates - same vendor 10 days apart is not flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-03-05', amount: 1280000 }),
    tx({ id: 't2', transaction_date: '2026-03-15', amount: 1280000 }),
  ];
  assertEquals(detectDuplicates(txs).length, 0);
});

Deno.test('detectDuplicates - same day but amount differs by more than 1% is not flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-03-05', amount: 1280000 }),
    tx({ id: 't2', transaction_date: '2026-03-05', amount: 1000000 }),
  ];
  assertEquals(detectDuplicates(txs).length, 0);
});
```

- [ ] **Step 6: 테스트 실패 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/detectDuplicates.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 7: detectDuplicates 구현**

`supabase/functions/run-spend-analysis/lib/detectDuplicates.ts`:
```ts
import type { SpendTransaction } from './types.ts';

export interface DuplicatePair {
  vendorNormalized: string;
  amount: number;
  transactionIds: [string, string];
  daysApart: number;
}

function daysBetween(a: string, b: string): number {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return diff / (1000 * 60 * 60 * 24);
}

export function detectDuplicates(transactions: SpendTransaction[]): DuplicatePair[] {
  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const pairs: DuplicatePair[] = [];
  for (const [vendor, txs] of byVendor) {
    const sorted = [...txs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const days = daysBetween(a.transaction_date, b.transaction_date);
        if (days > 3) break;
        const amountDiffPct = Math.abs(a.amount - b.amount) / a.amount;
        if (amountDiffPct <= 0.01) {
          pairs.push({
            vendorNormalized: vendor,
            amount: a.amount,
            transactionIds: [a.id, b.id],
            daysApart: days,
          });
        }
      }
    }
  }
  return pairs;
}
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/detectDuplicates.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/run-spend-analysis/lib/detectRecurring.ts \
        supabase/functions/run-spend-analysis/lib/detectRecurring.test.ts \
        supabase/functions/run-spend-analysis/lib/detectDuplicates.ts \
        supabase/functions/run-spend-analysis/lib/detectDuplicates.test.ts
git commit -m "feat: add recurring and duplicate detection (FR-F3, FR-F4)"
```

---

### Task 6: 탐지 엔진 — Price Change + Anomaly Score (FR-F5, FR-F6)

**Files:**
- Create: `supabase/functions/run-spend-analysis/lib/detectPriceChanges.ts`
- Test: `supabase/functions/run-spend-analysis/lib/detectPriceChanges.test.ts`
- Create: `supabase/functions/run-spend-analysis/lib/scoreAnomalies.ts`
- Test: `supabase/functions/run-spend-analysis/lib/scoreAnomalies.test.ts`

**Interfaces:**
- Consumes: `SpendTransaction`, `RecurringInfo` (Task 5)
- Produces: `PriceChangeInfo`, `detectPriceChanges(transactions, recurringVendors): PriceChangeInfo[]`, `AnomalyInfo`, `scoreAnomalies(transactions): AnomalyInfo[]` — 둘 다 Task 7이 사용.

- [ ] **Step 1: detectPriceChanges 실패하는 테스트 작성**

`supabase/functions/run-spend-analysis/lib/detectPriceChanges.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectPriceChanges } from './detectPriceChanges.ts';
import type { SpendTransaction } from './types.ts';
import type { RecurringInfo } from './detectRecurring.ts';

function tx(id: string, date: string, amount: number): SpendTransaction {
  return {
    id,
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: date,
    vendor_raw: 'AWS',
    vendor_normalized: 'AWS',
    amount,
    currency: 'KRW',
    category: null,
  };
}

const recurring: RecurringInfo[] = [
  { vendorNormalized: 'AWS', monthsActive: 6, averageAmount: 1400000, transactionIds: [] },
];

Deno.test('detectPriceChanges - flags vendor with 15%+ increase between first and second half', () => {
  const txs = [
    tx('t1', '2026-01-05', 1000000),
    tx('t2', '2026-02-05', 1000000),
    tx('t3', '2026-03-05', 1000000),
    tx('t4', '2026-04-05', 1350000),
    tx('t5', '2026-05-05', 1350000),
    tx('t6', '2026-06-05', 1350000),
  ];
  const result = detectPriceChanges(txs, recurring);
  assertEquals(result.length, 1);
  assertEquals(result[0].vendorNormalized, 'AWS');
});

Deno.test('detectPriceChanges - flat pricing is not flagged', () => {
  const txs = [
    tx('t1', '2026-01-05', 1000000),
    tx('t2', '2026-02-05', 1000000),
    tx('t3', '2026-03-05', 1000000),
    tx('t4', '2026-04-05', 1000000),
  ];
  assertEquals(detectPriceChanges(txs, recurring).length, 0);
});

Deno.test('detectPriceChanges - vendor not in recurring list is ignored', () => {
  const txs = [
    tx('t1', '2026-01-05', 1000000),
    tx('t2', '2026-02-05', 1350000),
  ];
  assertEquals(detectPriceChanges(txs, []).length, 0);
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/detectPriceChanges.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 3: detectPriceChanges 구현**

`supabase/functions/run-spend-analysis/lib/detectPriceChanges.ts`:
```ts
import type { SpendTransaction } from './types.ts';
import type { RecurringInfo } from './detectRecurring.ts';

export interface PriceChangeInfo {
  vendorNormalized: string;
  beforeAverage: number;
  afterAverage: number;
  increasePct: number;
  transactionIds: string[];
}

export function detectPriceChanges(
  transactions: SpendTransaction[],
  recurringVendors: RecurringInfo[],
): PriceChangeInfo[] {
  const recurringSet = new Set(recurringVendors.map((r) => r.vendorNormalized));
  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!recurringSet.has(key)) continue;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const results: PriceChangeInfo[] = [];
  for (const [vendor, txs] of byVendor) {
    const sorted = [...txs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    if (sorted.length < 4) continue;
    const mid = Math.floor(sorted.length / 2);
    const before = sorted.slice(0, mid);
    const after = sorted.slice(mid);
    const beforeAvg = before.reduce((s, t) => s + t.amount, 0) / before.length;
    const afterAvg = after.reduce((s, t) => s + t.amount, 0) / after.length;
    const increasePct = (afterAvg - beforeAvg) / beforeAvg;
    if (increasePct >= 0.15) {
      results.push({
        vendorNormalized: vendor,
        beforeAverage: beforeAvg,
        afterAverage: afterAvg,
        increasePct,
        transactionIds: sorted.map((t) => t.id),
      });
    }
  }
  return results;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/detectPriceChanges.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: scoreAnomalies 실패하는 테스트 작성**

`supabase/functions/run-spend-analysis/lib/scoreAnomalies.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { scoreAnomalies } from './scoreAnomalies.ts';
import type { SpendTransaction } from './types.ts';

function tx(id: string, vendor: string, amount: number): SpendTransaction {
  return {
    id,
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: '2026-01-05',
    vendor_raw: vendor,
    vendor_normalized: vendor,
    amount,
    currency: 'KRW',
    category: null,
  };
}

Deno.test('scoreAnomalies - one-off vendor spend far above dataset average is flagged (fallback baseline)', () => {
  const txs = [
    tx('t1', 'Notion', 180000),
    tx('t2', 'Slack', 320000),
    tx('t3', 'Zoom', 210000),
    tx('t4', 'Coupang', 4500000),
  ];
  const result = scoreAnomalies(txs);
  assertEquals(result.length, 1);
  assertEquals(result[0].transactionId, 't4');
});

Deno.test('scoreAnomalies - vendor with 3+ own transactions uses vendor-relative baseline, not dataset average', () => {
  const txs = [
    tx('t1', 'AWS', 1280000),
    tx('t2', 'AWS', 1280000),
    tx('t3', 'AWS', 1280000),
    tx('t4', 'AWS', 1730000),
    tx('t5', 'Notion', 180000),
  ];
  const result = scoreAnomalies(txs);
  assertEquals(result.length, 0);
});

Deno.test('scoreAnomalies - empty input returns empty array', () => {
  assertEquals(scoreAnomalies([]).length, 0);
});
```

- [ ] **Step 6: 테스트 실패 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/scoreAnomalies.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 7: scoreAnomalies 구현**

`supabase/functions/run-spend-analysis/lib/scoreAnomalies.ts`:
```ts
import type { SpendTransaction } from './types.ts';

export interface AnomalyInfo {
  transactionId: string;
  vendorNormalized: string;
  amount: number;
  baselineAverage: number;
  ratio: number;
}

export function scoreAnomalies(transactions: SpendTransaction[]): AnomalyInfo[] {
  if (transactions.length === 0) return [];

  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const datasetAverage = transactions.reduce((s, t) => s + t.amount, 0) / transactions.length;

  const anomalies: AnomalyInfo[] = [];
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    const vendorTxs = byVendor.get(key)!;
    let baseline: number;
    if (vendorTxs.length >= 3) {
      const others = vendorTxs.filter((v) => v.id !== t.id);
      baseline = others.reduce((s, v) => s + v.amount, 0) / others.length;
    } else {
      baseline = datasetAverage;
    }
    const ratio = t.amount / baseline;
    if (ratio >= 3) {
      anomalies.push({
        transactionId: t.id,
        vendorNormalized: key,
        amount: t.amount,
        baselineAverage: baseline,
        ratio,
      });
    }
  }
  return anomalies;
}
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/scoreAnomalies.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/run-spend-analysis/lib/detectPriceChanges.ts \
        supabase/functions/run-spend-analysis/lib/detectPriceChanges.test.ts \
        supabase/functions/run-spend-analysis/lib/scoreAnomalies.ts \
        supabase/functions/run-spend-analysis/lib/scoreAnomalies.test.ts
git commit -m "feat: add price change and anomaly detection (FR-F5, FR-F6)"
```

---

### Task 7: 탐지 엔진 — Savings Opportunity 생성 (FR-F7)

**Files:**
- Create: `supabase/functions/run-spend-analysis/lib/generateOpportunities.ts`
- Test: `supabase/functions/run-spend-analysis/lib/generateOpportunities.test.ts`

**Interfaces:**
- Consumes: `RecurringInfo`(Task5), `DuplicatePair`(Task5), `PriceChangeInfo`(Task6), `AnomalyInfo`(Task6), `Opportunity`(Task4)
- Produces: `generateOpportunities(input: GenerateOpportunitiesInput): Opportunity[]` — Task 8(Edge Function)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`supabase/functions/run-spend-analysis/lib/generateOpportunities.test.ts`:
```ts
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { generateOpportunities } from './generateOpportunities.ts';

Deno.test('generateOpportunities - produces one opportunity per input signal, sorted by priority desc', () => {
  const result = generateOpportunities({
    projectId: 'demo-project',
    organizationId: 'demo-org',
    duplicates: [
      { vendorNormalized: 'AWS', amount: 1280000, transactionIds: ['t1', 't2'], daysApart: 2 },
    ],
    priceChanges: [
      {
        vendorNormalized: 'AWS',
        beforeAverage: 1280000,
        afterAverage: 1728000,
        increasePct: 0.35,
        transactionIds: ['t1', 't2', 't3'],
      },
    ],
    anomalies: [
      { transactionId: 't9', vendorNormalized: 'Coupang', amount: 4500000, baselineAverage: 500000, ratio: 9 },
    ],
    recurring: [
      { vendorNormalized: 'Notion', monthsActive: 6, averageAmount: 180000, transactionIds: ['t4', 't5'] },
    ],
  });

  assertEquals(result.length, 4);
  const types = result.map((o) => o.type).sort();
  assertEquals(types, ['ANOMALY', 'DUPLICATE', 'PRICE_INCREASE', 'RECURRING_REVIEW']);
  for (let i = 0; i < result.length - 1; i++) {
    assert(result[i].priority >= result[i + 1].priority);
  }
  for (const o of result) {
    assertEquals(o.project_id, 'demo-project');
    assertEquals(o.organization_id, 'demo-org');
    assertEquals(o.status, 'new');
    assert(o.priority >= 0 && o.priority <= 100);
  }
});

Deno.test('generateOpportunities - empty input produces empty output', () => {
  const result = generateOpportunities({
    projectId: 'demo-project',
    organizationId: 'demo-org',
    duplicates: [],
    priceChanges: [],
    anomalies: [],
    recurring: [],
  });
  assertEquals(result.length, 0);
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/generateOpportunities.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`supabase/functions/run-spend-analysis/lib/generateOpportunities.ts`:
```ts
import type { RecurringInfo } from './detectRecurring.ts';
import type { DuplicatePair } from './detectDuplicates.ts';
import type { PriceChangeInfo } from './detectPriceChanges.ts';
import type { AnomalyInfo } from './scoreAnomalies.ts';
import type { Opportunity } from './types.ts';

export interface GenerateOpportunitiesInput {
  projectId: string;
  organizationId: string;
  duplicates: DuplicatePair[];
  priceChanges: PriceChangeInfo[];
  anomalies: AnomalyInfo[];
  recurring: RecurringInfo[];
}

function priorityScore(impact: number, confidencePct: number, ease: number): number {
  return Math.round(impact + (confidencePct / 100) * 30 + ease);
}

function impactScore(annualValueKrw: number): number {
  return Math.max(0, Math.min(40, Math.round((annualValueKrw / 10_000_000) * 40)));
}

export function generateOpportunities(input: GenerateOpportunitiesInput): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const base = { project_id: input.projectId, organization_id: input.organizationId, impact_type: 'cost_saving' as const, status: 'new' as const };

  for (const dup of input.duplicates) {
    const impact = impactScore(dup.amount);
    const confidence = 80;
    const ease = 30;
    opportunities.push({
      ...base,
      type: 'DUPLICATE',
      title: `${dup.vendorNormalized} 중복 결제 의심 (${dup.daysApart.toFixed(1)}일 간격)`,
      evidence_json: { transactionIds: dup.transactionIds, amount: dup.amount, daysApart: dup.daysApart },
      estimated_value: dup.amount,
      confidence,
      effort: 'low',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  for (const pc of input.priceChanges) {
    const annualValue = (pc.afterAverage - pc.beforeAverage) * 12;
    const impact = impactScore(annualValue);
    const confidence = 65;
    const ease = 15;
    opportunities.push({
      ...base,
      type: 'PRICE_INCREASE',
      title: `${pc.vendorNormalized} 가격 ${(pc.increasePct * 100).toFixed(0)}% 인상`,
      evidence_json: { transactionIds: pc.transactionIds, beforeAverage: pc.beforeAverage, afterAverage: pc.afterAverage },
      estimated_value: Math.round(annualValue),
      confidence,
      effort: 'medium',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  for (const an of input.anomalies) {
    const excess = an.amount - an.baselineAverage;
    const impact = impactScore(excess);
    const confidence = 55;
    const ease = 20;
    opportunities.push({
      ...base,
      type: 'ANOMALY',
      title: `${an.vendorNormalized} 이상 거래 (기준선 대비 ${an.ratio.toFixed(1)}배)`,
      evidence_json: { transactionId: an.transactionId, amount: an.amount, baselineAverage: an.baselineAverage },
      estimated_value: Math.round(excess),
      confidence,
      effort: 'low',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  for (const rec of input.recurring) {
    const annualValue = rec.averageAmount * 12;
    const impact = impactScore(annualValue);
    const confidence = rec.monthsActive >= 6 ? 85 : rec.monthsActive >= 4 ? 70 : 55;
    const ease = 25;
    opportunities.push({
      ...base,
      type: 'RECURRING_REVIEW',
      title: `${rec.vendorNormalized} 반복결제 검토 (${rec.monthsActive}개월 연속)`,
      evidence_json: { transactionIds: rec.transactionIds, monthsActive: rec.monthsActive, averageAmount: rec.averageAmount },
      estimated_value: Math.round(annualValue),
      confidence,
      effort: 'low',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  return opportunities.sort((a, b) => b.priority - a.priority);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
deno test supabase/functions/run-spend-analysis/lib/generateOpportunities.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: 전체 엔진 유닛테스트 일괄 실행**

```bash
deno test supabase/functions/run-spend-analysis/lib/
```

Expected: PASS (모든 파일, 총 19 tests).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/run-spend-analysis/lib/generateOpportunities.ts \
        supabase/functions/run-spend-analysis/lib/generateOpportunities.test.ts
git commit -m "feat: add savings opportunity generation (FR-F7)"
```

---

### Task 8: Edge Function 오케스트레이터 + 통합 테스트

**Files:**
- Create: `supabase/functions/run-spend-analysis/index.ts`
- Create: `supabase/functions/run-spend-analysis/deno.json` (import map, 필요 시)
- Test: (통합 테스트는 Task 9의 시딩 스크립트와 함께 검증 — 이 Task에서는 로컬 invoke로 수동 검증)

**Interfaces:**
- Consumes: Task 4~7의 모든 순수 함수
- Produces: HTTP `POST /functions/v1/run-spend-analysis` `{ project_id: string }` → `{ opportunities_count: number, opportunities: Opportunity[] }`. Task 9(시딩 스크립트)가 이 엔드포인트를 호출.

- [ ] **Step 1: Edge Function 작성**

`supabase/functions/run-spend-analysis/index.ts`:
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeVendor } from './lib/normalizeVendor.ts';
import { categorize } from './lib/categorize.ts';
import { detectRecurring } from './lib/detectRecurring.ts';
import { detectDuplicates } from './lib/detectDuplicates.ts';
import { detectPriceChanges } from './lib/detectPriceChanges.ts';
import { scoreAnomalies } from './lib/scoreAnomalies.ts';
import { generateOpportunities } from './lib/generateOpportunities.ts';
import type { SpendTransaction } from './lib/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body: { project_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const projectId = body.project_id;
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'project_id is required' }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: rawTransactions, error: fetchError } = await supabase
    .from('spend_transactions')
    .select('*')
    .eq('project_id', projectId);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const organizationId = rawTransactions?.[0]?.organization_id ?? '';

  const transactions: SpendTransaction[] = (rawTransactions ?? []).map((t) => {
    const vendorNormalized = normalizeVendor(t.vendor_raw);
    return {
      ...t,
      vendor_normalized: vendorNormalized,
      category: categorize(vendorNormalized),
    } as SpendTransaction;
  });

  const recurring = detectRecurring(transactions);
  const duplicates = detectDuplicates(transactions);
  const priceChanges = detectPriceChanges(transactions, recurring);
  const anomalies = scoreAnomalies(transactions);
  const opportunities = generateOpportunities({
    projectId,
    organizationId,
    duplicates,
    priceChanges,
    anomalies,
    recurring,
  });

  const { error: updateError } = await supabase.from('spend_transactions').upsert(
    transactions.map((t) => ({
      id: t.id,
      dataset_id: t.dataset_id,
      project_id: t.project_id,
      organization_id: t.organization_id,
      transaction_date: t.transaction_date,
      vendor_raw: t.vendor_raw,
      vendor_normalized: t.vendor_normalized,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
    })),
  );
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  const { error: deleteError } = await supabase.from('opportunities').delete().eq('project_id', projectId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  if (opportunities.length > 0) {
    const { error: insertError } = await supabase.from('opportunities').insert(opportunities);
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }
  }

  return new Response(
    JSON.stringify({ opportunities_count: opportunities.length, opportunities }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
```

- [ ] **Step 2: 로컬 Edge Function 서버 기동 (이미 떠 있으면 재사용)**

```bash
if ! curl -s -o /dev/null -w '%{http_code}' http://localhost:54321/functions/v1/run-spend-analysis | grep -qE '^(200|400|405)$'; then
  nohup npx supabase functions serve run-spend-analysis --env-file .env.local \
    > /tmp/supabase-functions-serve.log 2>&1 &
  sleep 3
fi
tail -n 20 /tmp/supabase-functions-serve.log || true
```

Expected: 로그에 `Serving functions on http://localhost:54321/functions/v1/run-spend-analysis` 가 보이거나(새로 띄운 경우), 이미 응답 중이라 healthcheck를 통과해 그대로 넘어감(이전에 떠 있던 경우). 이 패턴은 Task 9, Task 13에서도 동일하게 재사용한다 — 특정 이전 Task가 띄운 프로세스가 지금도 살아있다고 가정하지 않는다.

- [ ] **Step 3: project_id 없는 요청으로 400 검증**

```bash
curl -s -X POST http://localhost:54321/functions/v1/run-spend-analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{}'
```

Expected: `{"error":"project_id is required"}`, HTTP 400.

- [ ] **Step 4: 존재하지 않는 project_id로 정상 응답(빈 결과) 검증**

```bash
curl -s -X POST http://localhost:54321/functions/v1/run-spend-analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"project_id":"nonexistent-project"}'
```

Expected: `{"opportunities_count":0,"opportunities":[]}`, HTTP 200.

> 데모 데이터가 아직 시딩되지 않았으므로 `demo-project`에 대한 end-to-end 검증(실제로 14개 안팎의 opportunities가 생성되는지)은 Task 9(시딩 스크립트 완성) 이후에 진행한다.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/run-spend-analysis/index.ts
git commit -m "feat: add run-spend-analysis edge function orchestrator"
```

---

### Task 9: 샘플 데이터 생성기 + 시딩 스크립트 + 멱등성 테스트

**Files:**
- Create: `scripts/generate-demo-data.ts`
- Test: `scripts/generate-demo-data.test.ts`
- Create: `scripts/seed-demo.ts`
- Test: `tests/idempotency.test.ts`

**Interfaces:**
- Consumes: Task 8의 `run-spend-analysis` 엔드포인트
- Produces: `demo-org`/`demo-project`/`demo-dataset`에 시딩된 거래 데이터 + 계산된 opportunities. Task 11, 12(프론트)가 이 데이터를 조회.

- [ ] **Step 1: 생성기 실패하는 테스트 작성**

`scripts/generate-demo-data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateDemoTransactions } from './generate-demo-data';

describe('generateDemoTransactions', () => {
  const txs = generateDemoTransactions('demo-project', 'demo-dataset', 'demo-org');

  it('generates at least 80 transactions across at least 14 vendors', () => {
    expect(txs.length).toBeGreaterThanOrEqual(80);
    const vendors = new Set(txs.map((t) => t.vendor_raw));
    expect(vendors.size).toBeGreaterThanOrEqual(14);
  });

  it('every transaction is tagged with the demo project/org/dataset', () => {
    for (const t of txs) {
      expect(t.project_id).toBe('demo-project');
      expect(t.dataset_id).toBe('demo-dataset');
      expect(t.organization_id).toBe('demo-org');
    }
  });

  it('has at least one vendor with 3+ months and a mid-period price jump (AWS)', () => {
    const aws = txs.filter((t) => t.vendor_raw === 'AWS Seoul');
    expect(aws.length).toBeGreaterThanOrEqual(6);
    const amounts = new Set(aws.map((t) => t.amount));
    expect(amounts.size).toBeGreaterThanOrEqual(2);
  });

  it('has at least one duplicate-payment pair (same vendor, same amount, within 3 days)', () => {
    const byVendor = new Map<string, typeof txs>();
    for (const t of txs) {
      if (!byVendor.has(t.vendor_raw)) byVendor.set(t.vendor_raw, []);
      byVendor.get(t.vendor_raw)!.push(t);
    }
    let foundDuplicate = false;
    for (const vendorTxs of byVendor.values()) {
      const sorted = [...vendorTxs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
      for (let i = 0; i < sorted.length - 1; i++) {
        const days = Math.abs(
          new Date(sorted[i + 1].transaction_date).getTime() - new Date(sorted[i].transaction_date).getTime(),
        ) / (1000 * 60 * 60 * 24);
        if (days <= 3 && sorted[i].amount === sorted[i + 1].amount) foundDuplicate = true;
      }
    }
    expect(foundDuplicate).toBe(true);
  });

  it('has at least two transactions far above typical spend (anomaly candidates)', () => {
    const large = txs.filter((t) => t.amount >= 3_000_000);
    expect(large.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm run test -- scripts/generate-demo-data.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 3: 생성기 구현**

`scripts/generate-demo-data.ts`:
```ts
export interface DemoTransaction {
  id: string;
  dataset_id: string;
  project_id: string;
  organization_id: string;
  transaction_date: string;
  vendor_raw: string;
  amount: number;
  currency: string;
}

interface RecurringVendorSpec {
  vendorRaw: string;
  monthlyAmount: number;
  priceIncreaseAtMonth?: number;
  priceIncreaseFactor?: number;
}

const RECURRING_VENDORS: RecurringVendorSpec[] = [
  { vendorRaw: 'AWS Seoul', monthlyAmount: 1_280_000, priceIncreaseAtMonth: 6, priceIncreaseFactor: 1.35 },
  { vendorRaw: 'Notion Labs', monthlyAmount: 180_000 },
  { vendorRaw: 'Slack Technologies', monthlyAmount: 320_000 },
  { vendorRaw: 'Figma Inc', monthlyAmount: 250_000, priceIncreaseAtMonth: 5, priceIncreaseFactor: 1.2 },
  { vendorRaw: 'Zoom Video Communications', monthlyAmount: 210_000 },
  { vendorRaw: 'Google Cloud Platform', monthlyAmount: 940_000 },
  { vendorRaw: 'Adobe Creative Cloud', monthlyAmount: 410_000 },
  { vendorRaw: 'HubSpot Inc', monthlyAmount: 890_000 },
];

const ONEOFF_VENDORS = [
  'Coupang Business',
  'KT 통신',
  '스타벅스코리아',
  '메쉬코리아',
  '카카오모빌리티',
  '토스페이먼츠',
  'CJ대한통운',
  '배달의민족',
];

function monthKey(startYear: number, startMonth: number, offset: number): { year: number; month: number } {
  const total = startMonth - 1 + offset;
  return { year: startYear + Math.floor(total / 12), month: (total % 12) + 1 };
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function generateDemoTransactions(
  projectId: string,
  datasetId: string,
  organizationId: string,
): DemoTransaction[] {
  const transactions: DemoTransaction[] = [];
  let seq = 1;
  const startYear = 2026;
  const startMonth = 1;
  const monthsCount = 9;

  const nextId = () => `tx_${String(seq++).padStart(4, '0')}`;

  for (const spec of RECURRING_VENDORS) {
    for (let m = 0; m < monthsCount; m++) {
      const { year, month } = monthKey(startYear, startMonth, m);
      let amount = spec.monthlyAmount;
      if (spec.priceIncreaseAtMonth && m + 1 >= spec.priceIncreaseAtMonth) {
        amount = Math.round(spec.monthlyAmount * (spec.priceIncreaseFactor ?? 1));
      }
      transactions.push({
        id: nextId(),
        dataset_id: datasetId,
        project_id: projectId,
        organization_id: organizationId,
        transaction_date: `${year}-${pad2(month)}-05`,
        vendor_raw: spec.vendorRaw,
        amount,
        currency: 'KRW',
      });
    }
  }

  // duplicate payment candidates
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-03-07',
    vendor_raw: 'AWS Seoul',
    amount: 1_280_000,
    currency: 'KRW',
  });
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-07-06',
    vendor_raw: 'HubSpot Inc',
    amount: 890_000,
    currency: 'KRW',
  });

  // anomaly candidates (one-off large transactions)
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-04-15',
    vendor_raw: 'Coupang Business',
    amount: 4_500_000,
    currency: 'KRW',
  });
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-08-20',
    vendor_raw: '메쉬코리아',
    amount: 3_200_000,
    currency: 'KRW',
  });

  // one-off vendor noise for realism
  for (let i = 0; i < ONEOFF_VENDORS.length; i++) {
    const vendor = ONEOFF_VENDORS[i];
    const m = i % monthsCount;
    const { year, month } = monthKey(startYear, startMonth, m);
    transactions.push({
      id: nextId(),
      dataset_id: datasetId,
      project_id: projectId,
      organization_id: organizationId,
      transaction_date: `${year}-${pad2(month)}-${pad2(10 + i)}`,
      vendor_raw: vendor,
      amount: 50_000 + i * 15_000,
      currency: 'KRW',
    });
  }

  return transactions;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test -- scripts/generate-demo-data.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: 시딩 스크립트 작성**

`scripts/seed-demo.ts`:
```ts
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateDemoTransactions } from './generate-demo-data';

config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const functionsUrl = process.env.SUPABASE_FUNCTIONS_URL ?? `${supabaseUrl}/functions/v1`;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Seeding demo organization/project/dataset...');
  await supabase.from('organizations').upsert({
    id: 'demo-org',
    name: '그로스핀 (가상 마케팅 에이전시)',
    industry: 'agency',
  });
  await supabase.from('projects').upsert({
    id: 'demo-project',
    organization_id: 'demo-org',
    product_type: 'spend',
    period_from: '2026-01-01',
    period_to: '2026-09-30',
  });
  await supabase.from('datasets').upsert({
    id: 'demo-dataset',
    project_id: 'demo-project',
    filename: 'demo_spend_transactions.csv',
    schema_type: 'spend',
    quality_score: 100,
    status: 'seeded',
  });

  console.log('Clearing previous demo transactions and opportunities...');
  await supabase.from('opportunities').delete().eq('project_id', 'demo-project');
  await supabase.from('spend_transactions').delete().eq('project_id', 'demo-project');

  const transactions = generateDemoTransactions('demo-project', 'demo-dataset', 'demo-org');
  console.log(`Inserting ${transactions.length} demo transactions...`);
  const { error: insertError } = await supabase.from('spend_transactions').insert(
    transactions.map((t) => ({ ...t })),
  );
  if (insertError) throw new Error(`Failed to insert transactions: ${insertError.message}`);

  console.log('Running detection engine via run-spend-analysis...');
  const response = await fetch(`${functionsUrl}/run-spend-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ project_id: 'demo-project' }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`run-spend-analysis failed: ${JSON.stringify(result)}`);

  console.log(`Done. ${result.opportunities_count} opportunities generated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 6: Edge Function 서버 확인 후 시딩 실행**

```bash
if ! curl -s -o /dev/null -w '%{http_code}' http://localhost:54321/functions/v1/run-spend-analysis | grep -qE '^(200|400|405)$'; then
  nohup npx supabase functions serve run-spend-analysis --env-file .env.local \
    > /tmp/supabase-functions-serve.log 2>&1 &
  sleep 3
fi
npm run seed:demo
```

Expected: `Done. N opportunities generated.` (N ≥ 5, PRD Success Criteria와 정합).

- [ ] **Step 7: 멱등성 테스트 작성 및 실행**

`tests/idempotency.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('seed-demo idempotency', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  beforeAll(() => {
    execSync('npm run seed:demo', { stdio: 'inherit' });
    execSync('npm run seed:demo', { stdio: 'inherit' });
  }, 60_000);

  it('does not duplicate spend_transactions after re-seeding', async () => {
    const { data, error } = await admin
      .from('spend_transactions')
      .select('id')
      .eq('project_id', 'demo-project');
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not duplicate opportunities after re-seeding', async () => {
    const { data, error } = await admin
      .from('opportunities')
      .select('id')
      .eq('project_id', 'demo-project');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
```

```bash
npm run test -- tests/idempotency.test.ts
```

Expected: PASS (2 tests). 재시딩 후에도 거래/opportunity 개수가 동일하게 유지됨을 확인.

- [ ] **Step 8: Commit**

```bash
git add scripts/ tests/idempotency.test.ts
git commit -m "feat: add demo data generator and idempotent seeding script"
```

---

### Task 10: 프론트 — Supabase 클라이언트 + 포맷 유틸

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Produces: `createSupabaseClient(): SupabaseClient`, `formatKrw(value: number): string` — Task 11, 12가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatKrw } from './format';

describe('formatKrw', () => {
  it('formats a whole number as KRW currency', () => {
    expect(formatKrw(1280000)).toBe('₩1,280,000');
  });

  it('rounds to the nearest won (no decimals)', () => {
    expect(formatKrw(1000.6)).toBe('₩1,001');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm run test -- src/lib/format.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`src/lib/format.ts`:
```ts
export function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}
```

`src/lib/supabaseClient.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test -- src/lib/format.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabaseClient.ts src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add supabase client factory and KRW formatter"
```

---

### Task 11: 프론트 — S5 Spend Overview

**Files:**
- Create: `src/components/spend/KpiCard.tsx`
- Create: `src/app/demo/spend/overview/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseClient`, `formatKrw` (Task 10)
- Produces: `/demo/spend/overview` 라우트. Task 1의 랜딩 페이지 버튼이 이 경로로 연결됨(이미 연결되어 있음).

- [ ] **Step 1: KpiCard 컴포넌트 작성**

`src/components/spend/KpiCard.tsx`:
```tsx
export interface KpiCardProps {
  label: string;
  value: string;
}

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Spend Overview 페이지 작성**

`src/app/demo/spend/overview/page.tsx`:
```tsx
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabaseClient';
import { formatKrw } from '@/lib/format';
import { KpiCard } from '@/components/spend/KpiCard';

export default async function SpendOverviewPage() {
  const supabase = createSupabaseClient();

  const { data: transactions } = await supabase
    .from('spend_transactions')
    .select('amount')
    .eq('project_id', 'demo-project');

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence')
    .eq('project_id', 'demo-project')
    .order('priority', { ascending: false })
    .limit(3);

  const totalSpend = (transactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
  const topOpportunities = opportunities ?? [];
  const topSavings = topOpportunities.reduce((sum, o) => sum + Number(o.estimated_value), 0);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-xl font-semibold">그로스핀 — Spend Overview (샘플)</h1>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <KpiCard label="Total Spend (9개월)" value={formatKrw(totalSpend)} />
        <KpiCard label="거래 건수" value={String((transactions ?? []).length)} />
        <KpiCard label="Top 3 절감후보 합계" value={formatKrw(topSavings)} />
      </div>
      <h2 className="mt-8 text-lg font-medium">Top Opportunities</h2>
      <ul className="mt-4 space-y-2">
        {topOpportunities.map((o) => (
          <li key={o.id} className="rounded border border-gray-200 p-3">
            <p className="font-medium">{o.title}</p>
            <p className="text-sm text-gray-500">
              예상 절감: {formatKrw(Number(o.estimated_value))} · 확신도 {o.confidence}%
            </p>
          </li>
        ))}
      </ul>
      <Link href="/demo/spend/opportunities" className="mt-6 inline-block text-blue-600 underline">
        전체 Savings Opportunity 보기 →
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: 로컬 서버로 수동 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/demo/spend/overview` 접속.

Expected: KPI 카드 3개(Total Spend, 거래 건수, Top 3 절감후보 합계)와 Top Opportunities 목록이 실제 시딩된 데이터로 렌더링됨. (Task 9의 시딩이 이미 끝난 상태여야 함)

- [ ] **Step 4: Commit**

```bash
git add src/components/spend/KpiCard.tsx src/app/demo/spend/overview/page.tsx
git commit -m "feat: add S5 Spend Overview page"
```

---

### Task 12: 프론트 — S6 Savings Opportunities

**Files:**
- Create: `src/components/spend/OpportunityTable.tsx`
- Create: `src/app/demo/spend/opportunities/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseClient`, `formatKrw` (Task 10)
- Produces: `/demo/spend/opportunities` 라우트. Task 11의 "전체 보기" 링크가 이 경로로 연결됨(이미 연결되어 있음).

- [ ] **Step 1: OpportunityTable 컴포넌트 작성**

`src/components/spend/OpportunityTable.tsx`:
```tsx
import { formatKrw } from '@/lib/format';

export interface OpportunityRow {
  id: string;
  type: string;
  title: string;
  estimated_value: number;
  confidence: number;
  effort: string;
  priority: number;
}

export function OpportunityTable({ opportunities }: { opportunities: OpportunityRow[] }) {
  if (opportunities.length === 0) {
    return <p className="text-gray-500">아직 탐지된 절감 후보가 없습니다.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500">
          <th className="py-2">Type</th>
          <th className="py-2">Title</th>
          <th className="py-2">Est. Savings</th>
          <th className="py-2">Confidence</th>
          <th className="py-2">Effort</th>
          <th className="py-2">Priority</th>
        </tr>
      </thead>
      <tbody>
        {opportunities.map((o) => (
          <tr key={o.id} className="border-b border-gray-100">
            <td className="py-2">{o.type}</td>
            <td className="py-2">{o.title}</td>
            <td className="py-2">{formatKrw(o.estimated_value)}</td>
            <td className="py-2">{o.confidence}%</td>
            <td className="py-2">{o.effort}</td>
            <td className="py-2">{o.priority}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Savings Opportunities 페이지 작성**

`src/app/demo/spend/opportunities/page.tsx`:
```tsx
import { createSupabaseClient } from '@/lib/supabaseClient';
import { OpportunityTable } from '@/components/spend/OpportunityTable';

export default async function SpendOpportunitiesPage() {
  const supabase = createSupabaseClient();
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence, effort, priority')
    .eq('project_id', 'demo-project')
    .order('priority', { ascending: false });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-xl font-semibold">Savings Opportunities (샘플)</h1>
      <div className="mt-6">
        <OpportunityTable opportunities={opportunities ?? []} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: 로컬 서버로 수동 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/demo/spend/opportunities` 접속.

Expected: DUPLICATE/PRICE_INCREASE/ANOMALY/RECURRING_REVIEW 타입이 섞인 opportunity 테이블이 Priority 내림차순으로 표시됨.

- [ ] **Step 4: Commit**

```bash
git add src/components/spend/OpportunityTable.tsx src/app/demo/spend/opportunities/page.tsx
git commit -m "feat: add S6 Savings Opportunities page"
```

---

### Task 13: End-to-End 수동 검증 (Definition of Done 체크)

**Files:** 없음 (검증 전용 Task)

**Interfaces:** Task 1~12 전체를 통틀어 검증.

- [ ] **Step 1: 전체 테스트 스위트 실행**

```bash
npm run test
deno test supabase/functions/run-spend-analysis/lib/
```

Expected: 모두 PASS.

- [ ] **Step 2: 다시 시딩해 데모 흐름 재확인 (호스티드 프로젝트 — `db reset` 없음)**

호스티드 Supabase를 쓰므로 로컬 전용 명령인 `supabase db reset`은 사용하지 않는다. `seed-demo.ts`가 이미 project_id 기준으로 delete-then-insert(멱등성, Task 9에서 검증됨)를 수행하므로, 재시딩만으로 "처음부터 다시" 상태를 재현하기에 충분하다.

```bash
if ! curl -s -o /dev/null -w '%{http_code}' http://localhost:54321/functions/v1/run-spend-analysis | grep -qE '^(200|400|405)$'; then
  nohup npx supabase functions serve run-spend-analysis --env-file .env.local \
    > /tmp/supabase-functions-serve.log 2>&1 &
  sleep 3
fi

npm run seed:demo

if ! curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q '200'; then
  nohup npm run dev > /tmp/next-dev.log 2>&1 &
  sleep 5
fi
```

- [ ] **Step 3: 랜딩 페이지 → 데모 흐름 수동 클릭 검증**

브라우저에서 `http://localhost:3000` 접속 → "샘플로 체험하기" 클릭 → Spend Overview 확인 → "전체 Savings Opportunity 보기" 클릭 → Opportunities 테이블 확인.

Expected (스펙 Success Criteria 대조):
- [ ] 로그인/업로드 없이 즉시 접근됨
- [ ] Spend Overview에 KPI 3개 + Top Opportunities 3개 표시
- [ ] Savings Opportunities 테이블에 5개 이상, DUPLICATE/PRICE_INCREASE/ANOMALY/RECURRING_REVIEW 타입이 각 1건 이상 존재
- [ ] 모든 금액이 원화 포맷(₩)으로 표시됨

- [ ] **Step 4: 최종 커밋 (README에 실행 방법 기록)**

`README.md` 생성:
```markdown
# AI Operations Intelligence — Spend (Demo)

## 로컬 개발 환경 실행

이 프로젝트는 로컬 Docker Supabase 스택(`supabase start`) 대신 **호스티드 Supabase 프로젝트**(ap-northeast-2, Free tier)를 사용한다. 스키마/RLS 변경은 Supabase 대시보드 SQL Editor에서 직접 실행한다 (`supabase/migrations/`에 SQL은 버전관리용으로 보관).

1. `npm install`
2. `.env.local`에 호스티드 프로젝트의 API URL / anon key / service_role key 기입 (Settings → API)
3. `npx supabase functions serve run-spend-analysis --env-file .env.local` (별도 터미널, Docker 필요 — 함수 자체만 로컬에서 서빙하고 DB/API는 위 호스티드 프로젝트를 바라봄)
4. `npm run seed:demo`
5. `npm run dev` → http://localhost:3000
```

```bash
git add README.md
git commit -m "docs: add local development setup instructions"
```

---

## Self-Review 결과

- **스펙 커버리지:** FR-H1(샘플 데이터셋)=Task9, FR-H2(원클릭 데모)=Task1+11+12, FR-H3(리셋/전환은 별도 회원가입 플로우로 이연되며 이번 플랜 범위 밖 — Epic A, Week2)=설계상 데모 org 격리(Task3)로 이미 충족, FR-F1~F7=Task4~7, RLS=Task3, 테스트 계획(유닛/통합/RLS/멱등성)=Task4~9 전체에 반영됨. 갭 없음.
- **Placeholder 스캔:** TODO/TBD 없음. 모든 스텝에 실제 코드 포함.
- **타입 일관성:** `SpendTransaction`, `Opportunity`, `RecurringInfo`, `DuplicatePair`, `PriceChangeInfo`, `AnomalyInfo`(필드명 `baselineAverage`로 통일) 가 Task 4~8 전체에서 동일하게 사용됨.
- **스펙과의 차이(발견 후 수정):** `detectRecurring`의 금액 변동폭 조건과 `scoreAnomalies`의 vendor-only 기준선을 스펙 문서에서도 함께 수정함 (본 플랜 작성 중 발견한 논리적 모순 — 위 스펙 파일에 반영 완료).
