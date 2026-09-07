# Real Customer CSV Upload Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실고객이 이메일로 가입해 워크스페이스를 만들고, 자기 CSV를 업로드·매핑·품질검사한 뒤, Epic H에서 만든 것과 동일한 탐지 엔진 결과를 로그인 전용 화면에서 확인할 수 있게 한다.

**Architecture:** Supabase Auth(이메일/비밀번호) + `memberships` 테이블로 멀티테넌시 구현. Next.js Server Action이 탐지 엔진(`supabase/functions/run-spend-analysis/lib/*`)의 7개 순수 함수를 **in-process로 직접 호출**한다 — Edge Function 배포나 HTTP 호출 없이, `@engine/*` path alias로 기존 엔진 소스를 그대로 재사용. 온보딩(업로드→매핑→품질검사)은 `/onboarding` 레이아웃에 감싸인 React Context로 단계 간 상태를 유지하는 3단계 클라이언트 위저드.

**Tech Stack:** Next.js 14(TS, App Router) · Tailwind · Supabase(Postgres/Auth/RLS/Storage) · `@supabase/ssr`(SSR 세션) · PapaParse(CSV 파싱) · Vitest

**Spec:** `docs/superpowers/specs/2026-09-06-real-upload-pipeline-design.md`

## Global Constraints

- 예산 0원 — Supabase 무료 티어, 새 유료 서비스 없음.
- DDL(신규 테이블, RLS 정책, Storage 버킷)은 로컬 Docker가 아니라 **호스티드 Supabase 프로젝트의 대시보드 SQL Editor**에 사용자가 직접 붙여넣는 방식으로 적용한다 — Epic H와 동일한 패턴.
- 모든 DB 쓰기(조직/프로젝트/멤버십/데이터셋/거래/기회 생성)는 **service-role 클라이언트**(`createSupabaseAdminClient`)로만 수행한다. authenticated 사용자는 SELECT만 RLS로 허용되고, INSERT/UPDATE/DELETE 정책은 만들지 않는다 — Epic H의 기존 원칙과 동일.
- 탐지 엔진(`supabase/functions/run-spend-analysis/lib/*.ts`)은 **수정하지 않는다**. `@engine/*` path alias(`tsconfig.json`에 이미 추가됨)로 import해서 그대로 재사용한다.
- Epic H의 데모 경로(`/demo/spend/*`, `demo-org`/`demo-project`, 시딩 스크립트, 로컬 Edge Function 서빙)는 이 계획으로 인해 전혀 변경되지 않는다.
- 필수 CSV 컬럼(하나라도 매핑 안 되면 진행 불가): `transaction_id`, `transaction_date`, `vendor_name_raw`, `amount`, `currency`.
- Quality Score = Completeness 45% + Validity 35% + Uniqueness 20%. 80점 이상 분석 가능 / 60~79 경고와 함께 진행 가능 / 60 미만 진행 불가. Blocker가 하나라도 있으면 점수와 무관하게 진행 불가.

---

## File Structure

```
package.json                                    (add @supabase/ssr, papaparse, @types/papaparse)
middleware.ts                                    (신규 — /onboarding, /workspace 라우트 보호)
src/lib/supabase/server.ts                       (신규 — SSR 서버 클라이언트)
src/lib/supabase/admin.ts                        (신규 — service-role 클라이언트, 서버 전용)
src/lib/columnMapping.ts                         (신규)
src/lib/columnMapping.test.ts
src/lib/csvQuality.ts                            (신규)
src/lib/csvQuality.test.ts
src/lib/engineIntegration.test.ts                (신규 — Node에서 엔진 in-process 재사용 검증)
src/app/signup/page.tsx                          (신규)
src/app/signup/actions.ts                        (신규)
src/app/login/page.tsx                           (신규)
src/app/login/actions.ts                         (신규)
src/app/onboarding/layout.tsx                    (신규)
src/app/onboarding/OnboardingContext.tsx          (신규)
src/app/onboarding/goal/page.tsx                 (신규)
src/app/onboarding/workspace/page.tsx            (신규)
src/app/onboarding/workspace/actions.ts          (신규)
src/app/onboarding/upload/page.tsx               (신규)
src/app/onboarding/mapping/page.tsx              (신규)
src/app/onboarding/quality/page.tsx              (신규)
src/app/onboarding/quality/actions.ts            (신규 — 엔진 in-process 호출)
src/app/workspace/[orgId]/spend/overview/page.tsx      (신규 — Epic H 컴포넌트 재사용)
src/app/workspace/[orgId]/spend/opportunities/page.tsx (신규 — Epic H 컴포넌트 재사용)
supabase/migrations/<timestamp>_memberships.sql        (신규)
supabase/migrations/<timestamp>_member_rls.sql         (신규)
supabase/migrations/<timestamp>_storage_bucket.sql     (신규)
```

---

### Task 1: Supabase SSR 클라이언트 + 미들웨어

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`
- Create: `middleware.ts`
- Modify: `package.json` (add `@supabase/ssr`)

**Interfaces:**
- Produces: `createSupabaseServerClient()`, `createSupabaseAdminClient()` — 이후 모든 인증/DB 작업 Task가 이 두 함수를 사용. (브라우저 전용 클라이언트는 만들지 않는다 — 이 계획의 모든 인증/DB 작업은 Server Action이나 Server Component에서 이뤄지므로 클라이언트 사이드 Supabase 접근이 필요 없다.)

- [ ] **Step 1: 의존성 추가**

`package.json`의 `dependencies`에 추가:
```json
"@supabase/ssr": "^0.12.6",
```

```bash
npm install
```

- [ ] **Step 2: 서버 클라이언트 작성**

`src/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없다 — 미들웨어가 세션 갱신을 담당한다.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Admin(service-role) 클라이언트 작성**

`src/lib/supabase/admin.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

// 서버 전용 — service-role 키를 쓰므로 Client Component에서 절대 import하지 않는다.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

- [ ] **Step 4: 미들웨어 작성**

`middleware.ts` (레포 루트):
```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/onboarding') || request.nextUrl.pathname.startsWith('/workspace');

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/onboarding/:path*', '/workspace/:path*'],
};
```

- [ ] **Step 5: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

Expected: 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/supabase middleware.ts
git commit -m "feat: add Supabase SSR clients and route-protection middleware"
```

---

### Task 2: DB 마이그레이션 — memberships 테이블 + RLS + Storage 버킷 (호스티드 프로젝트, 컨트롤러가 처리)

**Files:**
- Create: `supabase/migrations/<timestamp>_memberships.sql`
- Create: `supabase/migrations/<timestamp>_member_rls.sql`
- Create: `supabase/migrations/<timestamp>_storage_bucket.sql`

**Interfaces:**
- Produces: `memberships(id, organization_id, user_id, role, created_at)` 테이블, authenticated 사용자가 자기 조직 데이터를 읽을 수 있는 RLS 정책, Storage 버킷 `spend-uploads`.

**참고:** 이 프로젝트는 호스티드 Supabase(ap-northeast-2)를 쓰고, DDL은 로컬 CLI가 아니라 대시보드 SQL Editor에 직접 붙여넣는 방식으로 적용해왔다(Epic H Task 2/3와 동일). **이 Task는 subagent가 아니라 컨트롤러가 직접 사용자에게 SQL을 전달하고 실행을 확인한 뒤 완료 처리한다.**

- [ ] **Step 1: 마이그레이션 파일 3개 작성**

```bash
npx supabase migration new memberships
npx supabase migration new member_rls
npx supabase migration new storage_bucket
```

`supabase/migrations/<timestamp>_memberships.sql`:
```sql
create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table memberships enable row level security;

create policy "members can read their own memberships"
  on memberships for select
  using (user_id = auth.uid());
```

`supabase/migrations/<timestamp>_member_rls.sql`:
```sql
create policy "members can read their organization"
  on organizations for select
  using (
    exists (select 1 from memberships m where m.organization_id = organizations.id and m.user_id = auth.uid())
  );

create policy "members can read their projects"
  on projects for select
  using (
    exists (select 1 from memberships m where m.organization_id = projects.organization_id and m.user_id = auth.uid())
  );

create policy "members can read their datasets"
  on datasets for select
  using (
    exists (
      select 1 from memberships m
      join projects p on p.organization_id = m.organization_id
      where p.id = datasets.project_id and m.user_id = auth.uid()
    )
  );

create policy "members can read their spend transactions"
  on spend_transactions for select
  using (
    exists (select 1 from memberships m where m.organization_id = spend_transactions.organization_id and m.user_id = auth.uid())
  );

create policy "members can read their opportunities"
  on opportunities for select
  using (
    exists (select 1 from memberships m where m.organization_id = opportunities.organization_id and m.user_id = auth.uid())
  );
```

`supabase/migrations/<timestamp>_storage_bucket.sql`:
```sql
insert into storage.buckets (id, name, public)
values ('spend-uploads', 'spend-uploads', false)
on conflict (id) do nothing;
```

이 프로젝트의 Storage 접근은 전부 service-role Server Action을 통해서만 이뤄지므로(클라이언트가 직접 Storage를 읽거나 쓰지 않음) `storage.objects`에 대한 RLS 정책은 필요 없다 — service-role은 RLS를 우회한다.

- [ ] **Step 2: 사용자에게 SQL 전달, 대시보드 SQL Editor에서 3개 순서대로 실행 요청**

세 파일을 순서대로(memberships → member_rls → storage_bucket) 사용자에게 보여주고, Supabase 대시보드 SQL Editor에서 실행해달라고 요청한다.

- [ ] **Step 3: REST API로 검증**

```bash
set -a && source .env.local && set +a
curl -s -o /dev/null -w "memberships table HTTP %{http_code}\n" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/memberships?select=*&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: HTTP 200. (Storage 버킷 존재는 Task 10에서 실제 업로드로 검증한다.)

- [ ] **Step 4: 마이그레이션 파일 커밋**

```bash
git add supabase/migrations
git commit -m "feat: add memberships table, member RLS policies, and spend-uploads bucket"
```

---

### Task 3: 엔진 in-process 재사용 통합 테스트 (Node/Vitest에서 검증)

**Files:**
- Create: `src/lib/engineIntegration.test.ts`

**Interfaces:**
- Consumes: `supabase/functions/run-spend-analysis/lib/*`의 7개 함수 (기존 Epic H 산출물, 상대경로로 import — Vitest는 `tsconfig.json`의 `@engine/*` alias를 자동으로 읽지 않으므로 이 테스트 파일만 상대경로를 쓴다)
- Produces: Node/Vitest 환경에서 엔진이 Deno와 동일하게 동작한다는 확인 — Task 11(finalizeUpload)이 이 확인을 전제로 `@engine/*` alias를 실제 프로덕션 코드에서 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/engineIntegration.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeVendor } from '../../supabase/functions/run-spend-analysis/lib/normalizeVendor.ts';
import { categorize } from '../../supabase/functions/run-spend-analysis/lib/categorize.ts';
import { detectRecurring } from '../../supabase/functions/run-spend-analysis/lib/detectRecurring.ts';
import { detectDuplicates } from '../../supabase/functions/run-spend-analysis/lib/detectDuplicates.ts';
import { detectPriceChanges } from '../../supabase/functions/run-spend-analysis/lib/detectPriceChanges.ts';
import { scoreAnomalies } from '../../supabase/functions/run-spend-analysis/lib/scoreAnomalies.ts';
import { generateOpportunities } from '../../supabase/functions/run-spend-analysis/lib/generateOpportunities.ts';
import type { SpendTransaction } from '../../supabase/functions/run-spend-analysis/lib/types.ts';

function tx(id: string, date: string, vendorRaw: string, amount: number): SpendTransaction {
  const vendorNormalized = normalizeVendor(vendorRaw);
  return {
    id,
    dataset_id: 'd1',
    project_id: 'p1',
    organization_id: 'o1',
    transaction_date: date,
    vendor_raw: vendorRaw,
    vendor_normalized: vendorNormalized,
    amount,
    currency: 'KRW',
    category: categorize(vendorNormalized),
  };
}

describe('engine reuse from Node (not just Deno)', () => {
  it('runs the full detection pipeline in-process and produces opportunities', () => {
    const transactions: SpendTransaction[] = [
      tx('t1', '2026-01-05', 'AWS Seoul', 1000000),
      tx('t2', '2026-02-05', 'AWS Seoul', 1000000),
      tx('t3', '2026-03-05', 'AWS Seoul', 1000000),
      tx('t4', '2026-03-07', 'AWS Seoul', 1000000),
      tx('t5', '2026-01-10', 'Random Vendor', 10000000),
    ];

    const recurring = detectRecurring(transactions);
    const duplicates = detectDuplicates(transactions);
    const priceChanges = detectPriceChanges(transactions, recurring);
    const anomalies = scoreAnomalies(transactions);
    const opportunities = generateOpportunities({
      projectId: 'p1',
      organizationId: 'o1',
      duplicates,
      priceChanges,
      anomalies,
      recurring,
    });

    expect(transactions[0].vendor_normalized).toBe('AWS');
    expect(transactions[0].category).toBe('Cloud Infrastructure');
    expect(recurring).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(priceChanges).toHaveLength(0);
    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities.every((o) => o.project_id === 'p1' && o.organization_id === 'o1')).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실행 (이미 존재하는 엔진 파일을 가져다 쓰는 것이므로 바로 통과해야 한다 — RED/GREEN 사이클이 아니라 통합 확인용)**

```bash
npm run test -- src/lib/engineIntegration.test.ts
```

Expected: PASS (1 test). 만약 import 에러가 나면 `tsconfig.json`에 `allowImportingTsExtensions: true`가 있는지 확인한다(이미 있어야 함, Task 0 이전에 추가됨).

- [ ] **Step 3: Commit**

```bash
git add src/lib/engineIntegration.test.ts
git commit -m "test: verify the detection engine runs correctly from Node, not just Deno"
```

---

### Task 4: 컬럼 매핑 추천 로직

**Files:**
- Create: `src/lib/columnMapping.ts`
- Test: `src/lib/columnMapping.test.ts`

**Interfaces:**
- Produces: `STANDARD_FIELDS`, `suggestColumnMapping(headers: string[]): MappingSuggestion[]` — Task 9(온보딩 매핑 화면)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/columnMapping.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { suggestColumnMapping, STANDARD_FIELDS } from './columnMapping';

describe('STANDARD_FIELDS', () => {
  it('lists exactly the 5 required Spend fields plus optional passthrough fields', () => {
    const required = STANDARD_FIELDS.filter((f) => f.required).map((f) => f.field);
    expect(required.sort()).toEqual(
      ['amount', 'currency', 'transaction_date', 'transaction_id', 'vendor_name_raw'].sort(),
    );
  });
});

describe('suggestColumnMapping', () => {
  it('maps exact standard header names with full confidence', () => {
    const result = suggestColumnMapping(['transaction_id', 'amount']);
    expect(result[0]).toEqual({ header: 'transaction_id', field: 'transaction_id', confidence: 1 });
    expect(result[1].field).toBe('amount');
  });

  it('maps Korean synonyms to the correct standard field', () => {
    const result = suggestColumnMapping(['거래일자', '거래처', '금액']);
    expect(result[0].field).toBe('transaction_date');
    expect(result[1].field).toBe('vendor_name_raw');
    expect(result[2].field).toBe('amount');
  });

  it('maps close English variants above the confidence threshold', () => {
    const result = suggestColumnMapping(['vendor']);
    expect(result[0].field).toBe('vendor_name_raw');
  });

  it('leaves unrecognizable headers unmapped', () => {
    const result = suggestColumnMapping(['xyz123random']);
    expect(result[0].field).toBeNull();
    expect(result[0].confidence).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm run test -- src/lib/columnMapping.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`src/lib/columnMapping.ts`:
```ts
export interface StandardField {
  field: string;
  required: boolean;
  synonyms: string[];
}

export const STANDARD_FIELDS: StandardField[] = [
  { field: 'transaction_id', required: true, synonyms: ['transaction_id', 'id', 'tx_id', '거래id', '거래번호'] },
  { field: 'transaction_date', required: true, synonyms: ['transaction_date', 'date', '거래일', '거래일자', '날짜'] },
  {
    field: 'vendor_name_raw',
    required: true,
    synonyms: ['vendor_name_raw', 'vendor', 'vendor_name', '거래처', '가맹점', '공급사'],
  },
  { field: 'amount', required: true, synonyms: ['amount', '금액', '거래금액'] },
  { field: 'currency', required: true, synonyms: ['currency', '통화'] },
  { field: 'department', required: false, synonyms: ['department', '부서'] },
  { field: 'memo', required: false, synonyms: ['memo', '메모', '비고'] },
];

const CONFIDENCE_THRESHOLD = 0.5;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function diceCoefficient(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let intersection = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

export interface MappingSuggestion {
  header: string;
  field: string | null;
  confidence: number;
}

export function suggestColumnMapping(headers: string[]): MappingSuggestion[] {
  return headers.map((header) => {
    let best: { field: string; score: number } | null = null;
    for (const std of STANDARD_FIELDS) {
      for (const syn of std.synonyms) {
        const score = diceCoefficient(header, syn);
        if (!best || score > best.score) best = { field: std.field, score };
      }
    }
    if (best && best.score >= CONFIDENCE_THRESHOLD) {
      return { header, field: best.field, confidence: best.score };
    }
    return { header, field: null, confidence: 0 };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test -- src/lib/columnMapping.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/columnMapping.ts src/lib/columnMapping.test.ts
git commit -m "feat: add rule-based column mapping suggestion"
```

---

### Task 5: 데이터 품질 검사

**Files:**
- Create: `src/lib/csvQuality.ts`
- Test: `src/lib/csvQuality.test.ts`

**Interfaces:**
- Produces: `checkQuality(rows: QualityRow[]): QualityReport` — Task 10(품질검사 화면)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/csvQuality.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { checkQuality, type QualityRow } from './csvQuality';

function row(overrides: Partial<QualityRow>): QualityRow {
  return {
    transaction_id: 'tx_1',
    transaction_date: '2026-01-05',
    vendor_name_raw: 'AWS',
    amount: '100000',
    currency: 'KRW',
    ...overrides,
  };
}

describe('checkQuality', () => {
  it('gives a clean dataset a perfect score and allows proceeding', () => {
    const report = checkQuality([row({ transaction_id: 'a' }), row({ transaction_id: 'b' })]);
    expect(report.blockers).toHaveLength(0);
    expect(report.score).toBe(100);
    expect(report.canProceed).toBe(true);
  });

  it('flags a missing required field as a Blocker', () => {
    const report = checkQuality([row({ vendor_name_raw: '' })]);
    expect(report.blockers.length).toBeGreaterThan(0);
    expect(report.canProceed).toBe(false);
  });

  it('flags an unparseable date as a Blocker', () => {
    const report = checkQuality([row({ transaction_date: 'not-a-date' })]);
    expect(report.blockers.some((b) => b.reason.includes('transaction_date'))).toBe(true);
    expect(report.canProceed).toBe(false);
  });

  it('flags a non-numeric amount as a Blocker', () => {
    const report = checkQuality([row({ amount: 'abc' })]);
    expect(report.blockers.some((b) => b.reason.includes('amount'))).toBe(true);
    expect(report.canProceed).toBe(false);
  });

  it('flags duplicate transaction_id within the same batch as a Blocker', () => {
    const report = checkQuality([row({ transaction_id: 'dup' }), row({ transaction_id: 'dup' })]);
    expect(report.blockers.some((b) => b.reason.includes('중복'))).toBe(true);
    expect(report.canProceed).toBe(false);
  });

  it('flags a near-empty vendor name as a Warning, not a Blocker', () => {
    const report = checkQuality([row({ vendor_name_raw: 'A' })]);
    expect(report.blockers).toHaveLength(0);
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.canProceed).toBe(true);
  });

  it('flags a zero or negative amount as a Warning, not a Blocker', () => {
    const report = checkQuality([row({ amount: '0' })]);
    expect(report.blockers).toHaveLength(0);
    expect(report.warnings.some((w) => w.reason.includes('amount'))).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm run test -- src/lib/csvQuality.test.ts
```

Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`src/lib/csvQuality.ts`:
```ts
export interface QualityRow {
  transaction_id: string;
  transaction_date: string;
  vendor_name_raw: string;
  amount: string;
  currency: string;
}

export interface QualityIssue {
  rowIndex: number;
  reason: string;
}

export interface QualityReport {
  blockers: QualityIssue[];
  warnings: QualityIssue[];
  score: number;
  canProceed: boolean;
}

export function checkQuality(rows: QualityRow[]): QualityReport {
  const blockers: QualityIssue[] = [];
  const warnings: QualityIssue[] = [];
  const seenIds = new Set<string>();

  let completenessOk = 0;
  let validityOk = 0;
  let uniquenessOk = 0;

  rows.forEach((row, i) => {
    const hasRequired = Boolean(
      row.transaction_id && row.transaction_date && row.vendor_name_raw && row.amount && row.currency,
    );
    if (!hasRequired) {
      blockers.push({ rowIndex: i, reason: '필수 컬럼 값 없음' });
    } else {
      completenessOk++;
    }

    const dateValid = !Number.isNaN(Date.parse(row.transaction_date));
    const amountValid = row.amount !== '' && !Number.isNaN(Number(row.amount));
    if (!dateValid) blockers.push({ rowIndex: i, reason: 'transaction_date 파싱 불가' });
    if (!amountValid) blockers.push({ rowIndex: i, reason: 'amount 숫자 변환 불가' });
    if (dateValid && amountValid) validityOk++;

    if (row.transaction_id) {
      if (seenIds.has(row.transaction_id)) {
        blockers.push({ rowIndex: i, reason: `transaction_id 중복: ${row.transaction_id}` });
      } else {
        seenIds.add(row.transaction_id);
        uniquenessOk++;
      }
    }

    if (row.vendor_name_raw && row.vendor_name_raw.trim().length <= 1) {
      warnings.push({ rowIndex: i, reason: 'vendor_name_raw 불완전' });
    }
    if (amountValid && Number(row.amount) <= 0) {
      warnings.push({ rowIndex: i, reason: 'amount가 0 이하' });
    }
  });

  const n = rows.length || 1;
  const completeness = completenessOk / n;
  const validity = validityOk / n;
  const uniqueness = uniquenessOk / n;
  const score = Math.round(completeness * 45 + validity * 35 + uniqueness * 20);

  return { blockers, warnings, score, canProceed: blockers.length === 0 };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test -- src/lib/csvQuality.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/csvQuality.ts src/lib/csvQuality.test.ts
git commit -m "feat: add Spend-specific data quality checks and scoring"
```

---

### Task 6: 회원가입 + 로그인

**Files:**
- Create: `src/app/signup/page.tsx`, `src/app/signup/actions.ts`
- Create: `src/app/login/page.tsx`, `src/app/login/actions.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient` (Task 1)
- Produces: `/signup`, `/login` 라우트. 성공 시 `/onboarding/goal`로 리다이렉트.

- [ ] **Step 1: 회원가입 액션 작성**

`src/app/signup/actions.ts`:
```ts
'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/signup?error=이메일과 비밀번호를 입력해주세요.');
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect('/signup?checkEmail=1');
  }

  redirect('/onboarding/goal');
}
```

- [ ] **Step 2: 회원가입 화면 작성**

`src/app/signup/page.tsx`:
```tsx
import { signUp } from './actions';

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; checkEmail?: string };
}) {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">회원가입</h1>
      {searchParams.checkEmail && (
        <p className="mt-4 rounded bg-[#cde2fb] p-3 text-sm text-[#0b0b0b]">
          이메일로 확인 링크를 보냈습니다. 확인 후 로그인해주세요.
        </p>
      )}
      {searchParams.error && (
        <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{searchParams.error}</p>
      )}
      <form action={signUp} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <button type="submit" className="w-full rounded bg-[#2a78d6] px-4 py-2 text-white">
          가입하기
        </button>
      </form>
      <p className="mt-4 text-sm text-[#898781]">
        이미 계정이 있으신가요? <a href="/login" className="text-[#2a78d6] underline">로그인</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 3: 로그인 액션 작성**

`src/app/login/actions.ts`:
```ts
'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/onboarding/goal');
}
```

- [ ] **Step 4: 로그인 화면 작성**

`src/app/login/page.tsx`:
```tsx
import { signIn } from './actions';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">로그인</h1>
      {searchParams.error && (
        <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{searchParams.error}</p>
      )}
      <form action={signIn} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <button type="submit" className="w-full rounded bg-[#2a78d6] px-4 py-2 text-white">
          로그인
        </button>
      </form>
      <p className="mt-4 text-sm text-[#898781]">
        계정이 없으신가요? <a href="/signup" className="text-[#2a78d6] underline">회원가입</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 5: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

Expected: 에러 없음. `/signup`, `/login`이 라우트 목록에 나와야 한다.

- [ ] **Step 6: Commit**

```bash
git add src/app/signup src/app/login
git commit -m "feat: add signup and login pages"
```

---

### Task 7: 온보딩 레이아웃 + Context + 목표 선택 화면

**Files:**
- Create: `src/app/onboarding/OnboardingContext.tsx`
- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/goal/page.tsx`

**Interfaces:**
- Produces: `useOnboarding()` 훅과 `OnboardingProvider` — `/onboarding/*` 하위 모든 페이지(Task 8~10)가 이 Context로 단계 간 상태(조직/프로젝트 ID, 업로드 파일, 헤더, 행, 매핑)를 공유한다. Next.js App Router에서 `layout.tsx`는 형제 라우트 간 네비게이션 시 리마운트되지 않으므로, 이 Context는 `/onboarding/workspace → upload → mapping → quality` 전 과정에서 유지된다.

- [ ] **Step 1: Context 작성**

`src/app/onboarding/OnboardingContext.tsx`:
```tsx
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
```

- [ ] **Step 2: 레이아웃 작성**

`src/app/onboarding/layout.tsx`:
```tsx
import type { ReactNode } from 'react';
import { OnboardingProvider } from './OnboardingContext';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
```

- [ ] **Step 3: 목표 선택 화면 작성**

`src/app/onboarding/goal/page.tsx`:
```tsx
import Link from 'next/link';

const GOALS = [
  { key: 'donation', label: '후원 결제 전환', enabled: false },
  { key: 'commerce', label: '이커머스 구매 전환/운영', enabled: false },
  { key: 'spend', label: '회사 지출 절감', enabled: true },
  { key: 'combined', label: '통합 진단', enabled: false },
];

export default function OnboardingGoalPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">무엇을 개선하고 싶으세요?</h1>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {GOALS.map((goal) =>
          goal.enabled ? (
            <Link
              key={goal.key}
              href="/onboarding/workspace"
              className="rounded-lg border border-[#e1e0d9] p-6 text-center font-medium hover:border-[#2a78d6]"
            >
              {goal.label}
            </Link>
          ) : (
            <div
              key={goal.key}
              className="rounded-lg border border-[#e1e0d9] p-6 text-center text-[#898781] opacity-60"
            >
              {goal.label}
              <p className="mt-1 text-xs">Coming Soon</p>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/OnboardingContext.tsx src/app/onboarding/layout.tsx src/app/onboarding/goal
git commit -m "feat: add onboarding layout, shared context, and goal selection screen"
```

---

### Task 8: 워크스페이스 생성

**Files:**
- Create: `src/app/onboarding/workspace/actions.ts`
- Create: `src/app/onboarding/workspace/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `createSupabaseAdminClient` (Task 1), `useOnboarding` (Task 7)
- Produces: `createWorkspace(name, industry): Promise<{organizationId, projectId}>` — Task 10(품질검사 액션)이 organizationId로 멤버십을 재확인할 때 참고할 패턴이 동일.

- [ ] **Step 1: 워크스페이스 생성 액션 작성**

`src/app/onboarding/workspace/actions.ts`:
```ts
'use server';

import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface CreateWorkspaceResult {
  organizationId: string;
  projectId: string;
}

export async function createWorkspace(name: string, industry: string): Promise<CreateWorkspaceResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const admin = createSupabaseAdminClient();
  const organizationId = randomUUID();
  const projectId = randomUUID();

  const { error: orgError } = await admin.from('organizations').insert({ id: organizationId, name, industry });
  if (orgError) throw new Error(`조직 생성 실패: ${orgError.message}`);

  const { error: projectError } = await admin
    .from('projects')
    .insert({ id: projectId, organization_id: organizationId, product_type: 'spend' });
  if (projectError) throw new Error(`프로젝트 생성 실패: ${projectError.message}`);

  const { error: membershipError } = await admin
    .from('memberships')
    .insert({ organization_id: organizationId, user_id: user.id, role: 'owner' });
  if (membershipError) throw new Error(`멤버십 생성 실패: ${membershipError.message}`);

  return { organizationId, projectId };
}
```

- [ ] **Step 2: 워크스페이스 생성 화면 작성**

`src/app/onboarding/workspace/page.tsx`:
```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../OnboardingContext';
import { createWorkspace } from './actions';

export default function OnboardingWorkspacePage() {
  const router = useRouter();
  const { setWorkspace } = useOnboarding();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await createWorkspace(name, industry);
      setWorkspace(result.organizationId, result.projectId);
      router.push('/onboarding/upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">워크스페이스 만들기</h1>
      {error && <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="name">
            조직명
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="industry">
            산업
          </label>
          <input
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? '생성 중...' : '다음'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/workspace
git commit -m "feat: add workspace creation screen and action"
```

---

### Task 9: CSV 업로드 화면

**Files:**
- Create: `src/app/onboarding/upload/page.tsx`
- Modify: `package.json` (add `papaparse`, `@types/papaparse`)

**Interfaces:**
- Consumes: `useOnboarding` (Task 7)
- Produces: Context에 `file`/`headers`/`rows` 채움 — Task 10(매핑)이 `headers`를, Task 11(품질검사)이 `rows`와 `file`을 사용.

- [ ] **Step 1: 의존성 추가**

`package.json`의 `dependencies`에 추가:
```json
"papaparse": "^5.7.0",
```
`devDependencies`에 추가:
```json
"@types/papaparse": "^5.5.2",
```

```bash
npm install
```

- [ ] **Step 2: 업로드 화면 작성**

`src/app/onboarding/upload/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useOnboarding } from '../OnboardingContext';

export default function OnboardingUploadPage() {
  const router = useRouter();
  const { setUpload } = useOnboarding();
  const [error, setError] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [ready, setReady] = useState(false);

  function handleFile(file: File) {
    setError(null);
    setReady(false);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV 파싱 오류: ${results.errors[0].message}`);
          return;
        }
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          setError('헤더를 찾을 수 없습니다.');
          return;
        }
        setPreviewHeaders(headers);
        setPreviewRows(results.data.slice(0, 20));
        setUpload(file, headers, results.data);
        setReady(true);
      },
      error: (err) => setError(`파일을 읽을 수 없습니다: ${err.message}`),
    });
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-xl font-semibold">CSV 업로드</h1>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="mt-6"
      />
      {error && <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{error}</p>}
      {previewHeaders.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-[#52514e]">미리보기 (상위 20행)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e1e0d9] text-[#898781]">
                  {previewHeaders.map((h) => (
                    <th key={h} className="whitespace-nowrap py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-[#f2f1ec]">
                    {previewHeaders.map((h) => (
                      <td key={h} className="whitespace-nowrap py-2 pr-4">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => router.push('/onboarding/mapping')}
            disabled={!ready}
            className="mt-6 rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
          >
            다음: 컬럼 매핑
          </button>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/onboarding/upload
git commit -m "feat: add CSV upload screen with client-side parsing and preview"
```

---

### Task 10: 컬럼 매핑 화면

**Files:**
- Create: `src/app/onboarding/mapping/page.tsx`

**Interfaces:**
- Consumes: `useOnboarding` (Task 7), `suggestColumnMapping`/`STANDARD_FIELDS` (Task 4)
- Produces: Context에 `mapping` 채움 — Task 11(품질검사)이 사용.

- [ ] **Step 1: 매핑 화면 작성**

`src/app/onboarding/mapping/page.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../OnboardingContext';
import { suggestColumnMapping, STANDARD_FIELDS } from '@/lib/columnMapping';

export default function OnboardingMappingPage() {
  const router = useRouter();
  const { headers, setMapping: saveMapping } = useOnboarding();
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (headers.length === 0) {
      router.replace('/onboarding/upload');
      return;
    }
    const suggestions = suggestColumnMapping(headers);
    const initial: Record<string, string> = {};
    for (const s of suggestions) {
      if (s.field) initial[s.header] = s.field;
    }
    setMapping(initial);
  }, [headers, router]);

  const requiredFields = STANDARD_FIELDS.filter((f) => f.required).map((f) => f.field);
  const mappedFields = new Set(Object.values(mapping));
  const allRequiredMapped = requiredFields.every((f) => mappedFields.has(f));

  function handleNext() {
    saveMapping(headers.map((header) => ({ header, field: mapping[header] ?? null })));
    router.push('/onboarding/quality');
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">컬럼 매핑</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#e1e0d9] text-[#898781]">
            <th className="py-2 font-normal">업로드 헤더</th>
            <th className="py-2 font-normal">표준 컬럼</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((header) => (
            <tr key={header} className="border-b border-[#f2f1ec]">
              <td className="py-2">{header}</td>
              <td className="py-2">
                <select
                  value={mapping[header] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                  className="rounded border border-[#e1e0d9] px-2 py-1"
                >
                  <option value="">(매핑 안 함)</option>
                  {STANDARD_FIELDS.map((f) => (
                    <option key={f.field} value={f.field}>
                      {f.field}
                      {f.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!allRequiredMapped && (
        <p className="mt-4 text-sm text-[#d03b3b]">필수 컬럼(*)을 모두 매핑해야 다음으로 진행할 수 있습니다.</p>
      )}
      <button
        onClick={handleNext}
        disabled={!allRequiredMapped}
        className="mt-6 rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
      >
        다음: 품질 검사
      </button>
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/mapping
git commit -m "feat: add column mapping confirmation screen"
```

---

### Task 11: 데이터 품질 화면 + 분석 실행 (엔진 in-process 호출)

**Files:**
- Create: `src/app/onboarding/quality/actions.ts`
- Create: `src/app/onboarding/quality/page.tsx`

**Interfaces:**
- Consumes: `useOnboarding` (Task 7), `checkQuality`/`QualityRow` (Task 5), `createSupabaseServerClient`/`createSupabaseAdminClient` (Task 1), `@engine/*`의 7개 함수(Epic H) — Task 3에서 Node 재사용이 이미 검증됨
- Produces: `finalizeUpload(input): Promise<FinalizeUploadResult>` — 성공 시 `/workspace/[orgId]/spend/overview`로 이동(Task 12).

- [ ] **Step 1: finalizeUpload 액션 작성**

`src/app/onboarding/quality/actions.ts`:
```ts
'use server';

import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { QualityRow } from '@/lib/csvQuality';
import { normalizeVendor } from '@engine/normalizeVendor.ts';
import { categorize } from '@engine/categorize.ts';
import { detectRecurring } from '@engine/detectRecurring.ts';
import { detectDuplicates } from '@engine/detectDuplicates.ts';
import { detectPriceChanges } from '@engine/detectPriceChanges.ts';
import { scoreAnomalies } from '@engine/scoreAnomalies.ts';
import { generateOpportunities } from '@engine/generateOpportunities.ts';
import type { SpendTransaction } from '@engine/types.ts';

export interface FinalizeUploadInput {
  organizationId: string;
  projectId: string;
  fileName: string;
  fileBuffer: ArrayBuffer;
  rows: QualityRow[];
}

export interface FinalizeUploadResult {
  organizationId: string;
  datasetId: string;
  opportunitiesCount: number;
}

export async function finalizeUpload(input: FinalizeUploadInput): Promise<FinalizeUploadResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const admin = createSupabaseAdminClient();

  const { data: membership } = await admin
    .from('memberships')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) throw new Error('이 조직에 대한 권한이 없습니다.');

  const datasetId = randomUUID();

  const { error: uploadError } = await admin.storage
    .from('spend-uploads')
    .upload(`${input.organizationId}/${datasetId}/${input.fileName}`, Buffer.from(input.fileBuffer), {
      contentType: 'text/csv',
    });
  if (uploadError) throw new Error(`파일 업로드 실패: ${uploadError.message}`);

  const { error: datasetError } = await admin.from('datasets').insert({
    id: datasetId,
    project_id: input.projectId,
    filename: input.fileName,
    schema_type: 'spend',
    status: 'uploaded',
  });
  if (datasetError) throw new Error(`데이터셋 생성 실패: ${datasetError.message}`);

  const transactions: SpendTransaction[] = input.rows.map((row, i) => {
    const vendorNormalized = normalizeVendor(row.vendor_name_raw);
    return {
      id: row.transaction_id || `${datasetId}-${i}`,
      dataset_id: datasetId,
      project_id: input.projectId,
      organization_id: input.organizationId,
      transaction_date: row.transaction_date,
      vendor_raw: row.vendor_name_raw,
      vendor_normalized: vendorNormalized,
      amount: Number(row.amount),
      currency: row.currency,
      category: categorize(vendorNormalized),
    };
  });

  const { error: insertError } = await admin.from('spend_transactions').insert(transactions.map((t) => ({ ...t })));
  if (insertError) throw new Error(`거래 데이터 저장 실패: ${insertError.message}`);

  const recurring = detectRecurring(transactions);
  const duplicates = detectDuplicates(transactions);
  const priceChanges = detectPriceChanges(transactions, recurring);
  const anomalies = scoreAnomalies(transactions);
  const opportunities = generateOpportunities({
    projectId: input.projectId,
    organizationId: input.organizationId,
    duplicates,
    priceChanges,
    anomalies,
    recurring,
  });

  const { error: deleteOppError } = await admin.from('opportunities').delete().eq('project_id', input.projectId);
  if (deleteOppError) throw new Error(`기존 분석 결과 삭제 실패: ${deleteOppError.message}`);

  if (opportunities.length > 0) {
    const { error: opportunityError } = await admin.from('opportunities').insert(opportunities);
    if (opportunityError) throw new Error(`분석 결과 저장 실패: ${opportunityError.message}`);
  }

  await admin.from('datasets').update({ status: 'analyzed' }).eq('id', datasetId);

  return { organizationId: input.organizationId, datasetId, opportunitiesCount: opportunities.length };
}
```

- [ ] **Step 2: 품질 화면 작성**

`src/app/onboarding/quality/page.tsx`:
```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../OnboardingContext';
import { checkQuality, type QualityRow } from '@/lib/csvQuality';
import { finalizeUpload } from './actions';

export default function OnboardingQualityPage() {
  const router = useRouter();
  const { organizationId, projectId, file, rows, mapping } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !projectId || !file || mapping.length === 0) {
      router.replace('/onboarding/upload');
    }
  }, [organizationId, projectId, file, mapping, router]);

  const mappedRows: QualityRow[] = useMemo(() => {
    return rows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const m of mapping) {
        if (m.field) mapped[m.field] = row[m.header] ?? '';
      }
      return mapped as unknown as QualityRow;
    });
  }, [rows, mapping]);

  const report = useMemo(() => checkQuality(mappedRows), [mappedRows]);

  function downloadErrorRows() {
    const allIssues = [...report.blockers, ...report.warnings];
    const lines = ['row_index,reason'];
    for (const issue of allIssues) {
      lines.push(`${issue.rowIndex},"${issue.reason}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quality_issues.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleStartAnalysis() {
    if (!organizationId || !projectId || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const fileBuffer = await file.arrayBuffer();
      const result = await finalizeUpload({
        organizationId,
        projectId,
        fileName: file.name,
        fileBuffer,
        rows: mappedRows,
      });
      router.push(`/workspace/${result.organizationId}/spend/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 시작에 실패했습니다.');
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">데이터 품질 검사</h1>
      <p className="mt-4 text-2xl font-semibold">{report.score}점</p>
      {report.blockers.length > 0 && (
        <div className="mt-4 rounded border border-[#e34948] bg-[#fde2e1] p-4">
          <p className="font-medium text-[#d03b3b]">Blocker {report.blockers.length}건 — 수정 후 다시 업로드해주세요.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {report.blockers.slice(0, 10).map((b, i) => (
              <li key={i}>
                행 {b.rowIndex + 1}: {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {report.warnings.length > 0 && (
        <div className="mt-4 rounded border border-[#eda100] bg-[#fdf3d9] p-4">
          <p className="font-medium text-[#8a6400]">Warning {report.warnings.length}건 — 진행은 가능합니다.</p>
        </div>
      )}
      {(report.blockers.length > 0 || report.warnings.length > 0) && (
        <button onClick={downloadErrorRows} className="mt-4 text-sm text-[#2a78d6] underline">
          오류행 CSV 다운로드
        </button>
      )}
      {error && <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{error}</p>}
      <button
        onClick={handleStartAnalysis}
        disabled={!report.canProceed || submitting}
        className="mt-6 rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? '분석 중...' : '분석 시작'}
      </button>
    </main>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

Expected: 에러 없음. `@engine/*` import가 정상 해석되어야 한다(Task 3에서 이미 검증된 경로).

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/quality
git commit -m "feat: add data quality screen and in-process engine analysis action"
```

---

### Task 12: 실데이터 Spend Overview 화면

**Files:**
- Create: `src/app/workspace/[orgId]/spend/overview/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseServerClient`(Task 1, anon 세션으로 RLS 적용), `StatTile`/`CategoryBarChart`/`MonthlyTrendChart`/`TopVendorsTable`/`spendAggregations`/`opportunityTypeMeta`/`icons`(Epic H, 변경 없이 재사용), `formatKrw`
- Produces: `/workspace/[orgId]/spend/overview` — 로그인한 사용자가 자기 조직 데이터만 볼 수 있는 실데이터 버전.

- [ ] **Step 1: 화면 작성**

`src/app/workspace/[orgId]/spend/overview/page.tsx`:
```tsx
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatKrw } from '@/lib/format';
import { sumByMonth, sumByCategory, topVendors, momDelta } from '@/lib/spendAggregations';
import { opportunityTypeMeta } from '@/lib/opportunityTypeMeta';
import { StatTile } from '@/components/spend/StatTile';
import { CategoryBarChart } from '@/components/spend/CategoryBarChart';
import { MonthlyTrendChart } from '@/components/spend/MonthlyTrendChart';
import { TopVendorsTable } from '@/components/spend/TopVendorsTable';
import { WalletIcon, RepeatIcon, PiggyBankIcon, AlertTriangleIcon } from '@/components/spend/icons';

import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EvidenceJson {
  annualSpend?: number;
}

export default async function WorkspaceSpendOverviewPage({ params }: { params: { orgId: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', params.orgId)
    .eq('product_type', 'spend')
    .maybeSingle();

  // RLS로 인해 다른 조직 데이터는 project가 null로 돌아온다 — 존재 여부를 노출하지 않도록
  // "권한 없음" 대신 404로 처리한다 (스펙의 Error Handling 원칙).
  if (!project) {
    notFound();
  }

  const { data: transactions } = await supabase
    .from('spend_transactions')
    .select('amount, transaction_date, category, vendor_normalized')
    .eq('project_id', project.id);

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence, evidence_json')
    .eq('project_id', project.id)
    .order('priority', { ascending: false });

  const txs = (transactions ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  const opps = (opportunities ?? []).map((o) => ({ ...o, estimated_value: Number(o.estimated_value) }));

  const totalSpend = txs.reduce((sum, t) => sum + t.amount, 0);
  const monthly = sumByMonth(txs);
  const delta = momDelta(monthly);
  const categoryTotals = sumByCategory(txs);
  const vendors = topVendors(txs, 5);

  const recurringOpportunities = opps.filter((o) => o.type === 'RECURRING_REVIEW');
  const recurringAnnualSpend = recurringOpportunities.reduce(
    (sum, o) => sum + ((o.evidence_json as EvidenceJson | null)?.annualSpend ?? 0),
    0,
  );
  const identifiedSavings = opps.reduce((sum, o) => sum + o.estimated_value, 0);
  const anomalyCount = opps.filter((o) => o.type === 'ANOMALY').length;
  const topOpportunities = opps.slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-xl font-semibold text-[#0b0b0b]">Spend Overview</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="총 지출"
          value={formatKrw(totalSpend)}
          icon={<WalletIcon />}
          delta={delta ? { pct: delta.deltaPct, label: '전월 대비' } : undefined}
        />
        <StatTile
          label="반복결제 규모"
          value={formatKrw(recurringAnnualSpend)}
          icon={<RepeatIcon />}
          sublabel={`${recurringOpportunities.length}개 벤더 (연간 환산)`}
        />
        <StatTile
          label="식별된 절감액"
          value={formatKrw(identifiedSavings)}
          icon={<PiggyBankIcon />}
          sublabel={`${opps.length}개 절감후보 기준`}
        />
        <StatTile label="이상거래" value={`${anomalyCount}건`} icon={<AlertTriangleIcon />} sublabel="즉시 확인 권장" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#e1e0d9] p-4">
          <h2 className="text-sm font-medium text-[#52514e]">카테고리별 지출</h2>
          <div className="mt-4">
            <CategoryBarChart data={categoryTotals} />
          </div>
        </section>
        <section className="rounded-lg border border-[#e1e0d9] p-4">
          <h2 className="text-sm font-medium text-[#52514e]">상위 5개 공급사</h2>
          <div className="mt-4">
            <TopVendorsTable vendors={vendors} totalSpend={totalSpend} />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-[#e1e0d9] p-4">
        <h2 className="text-sm font-medium text-[#52514e]">월별 지출 추이</h2>
        <div className="mt-4">
          <MonthlyTrendChart data={monthly} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[#e1e0d9] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#52514e]">절감후보 하이라이트</h2>
          <Link href={`/workspace/${params.orgId}/spend/opportunities`} className="text-sm text-[#2a78d6] underline">
            전체 보기 →
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {topOpportunities.map((o) => {
            const meta = opportunityTypeMeta(o.type);
            return (
              <li key={o.id} className="flex items-start gap-3 rounded border border-[#e1e0d9] p-3">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-[#898781]">{meta.label}</p>
                  <p className="font-medium text-[#0b0b0b]">{o.title}</p>
                  <p className="text-sm text-[#52514e]">
                    예상 절감: {formatKrw(o.estimated_value)} · 확신도 {o.confidence}%
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/workspace
git commit -m "feat: add real-customer Spend Overview page reusing Epic H components"
```

---

### Task 13: 실데이터 Savings Opportunities 화면

**Files:**
- Create: `src/app/workspace/[orgId]/spend/opportunities/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseServerClient`(Task 1), `OpportunityTable`(Epic H, 변경 없이 재사용)
- Produces: `/workspace/[orgId]/spend/opportunities`

- [ ] **Step 1: 화면 작성**

`src/app/workspace/[orgId]/spend/opportunities/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OpportunityTable } from '@/components/spend/OpportunityTable';

export const dynamic = 'force-dynamic';

export default async function WorkspaceSpendOpportunitiesPage({ params }: { params: { orgId: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', params.orgId)
    .eq('product_type', 'spend')
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence, effort, priority')
    .eq('project_id', project.id)
    .order('priority', { ascending: false });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-xl font-semibold">Savings Opportunities</h1>
      <div className="mt-6">
        <OpportunityTable opportunities={opportunities ?? []} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/workspace
git commit -m "feat: add real-customer Savings Opportunities page"
```

---

### Task 14: End-to-End 수동 검증 (Definition of Done)

**Files:** 없음 (검증 전용 Task)

**Interfaces:** Task 1~13 전체를 통틀어 검증.

- [ ] **Step 1: 전체 테스트 스위트 실행**

```bash
npm run test
deno test supabase/functions/run-spend-analysis/lib/
```

Expected: 모두 PASS (기존 Epic H 테스트 포함, 이번 Task들의 새 테스트 포함).

- [ ] **Step 2: 실제 회원가입부터 결과 확인까지 curl로 흐름 검증**

Playwright를 이용해 실제 브라우저로 전 과정을 검증한다(Epic H 대시보드 개선 작업에서 쓴 방식과 동일):

```bash
npm install --no-save playwright@1.63.0
npx playwright install chromium
```

임시 스크립트(`scripts/_e2e_check.mjs`, 커밋하지 않음)를 작성해 다음을 자동화한다: 랜덤 이메일로 회원가입 → `/onboarding/goal`에서 "회사 지출 절감" 클릭 → 워크스페이스 생성 폼 제출 → `data/spend_transactions_template.csv`에 실제 값을 채운 소규모 CSV(최소 10행, 반복 벤더 1곳 포함해 recurring 후보가 최소 1건 나오게 구성) 업로드 → 매핑 화면에서 필수 컬럼 자동매핑 확인 → 품질 화면에서 "분석 시작" 클릭 → `/workspace/{orgId}/spend/overview`로 리다이렉트되고 실제 금액이 렌더링되는지 확인.

Expected: 전 과정 에러 없이 완료, Overview 화면에 업로드한 데이터 기준 실제 총지출 금액이 표시됨.

- [ ] **Step 3: RLS 격리 재확인**

두 번째 이메일로 별도 계정을 만들어 워크스페이스를 생성하고, 첫 번째 계정의 `orgId`로 `/workspace/{orgId}/spend/overview`에 접근했을 때 Next.js 404 페이지가 뜨는지 확인한다(`notFound()` 호출 결과 — 다른 조직 데이터의 존재 여부조차 노출하지 않음).

- [ ] **Step 4: 정리**

```bash
npm uninstall playwright
rm -f scripts/_e2e_check.mjs
git status --short
```

Expected: 임시 파일이 커밋되지 않은 깨끗한 상태.

- [ ] **Step 5: README 업데이트**

`README.md`에 실고객 업로드 플로우 섹션 추가:
```markdown

## 실고객 업로드 플로우 (Week2)

1. `/signup`에서 이메일로 가입
2. `/onboarding/goal` → "회사 지출 절감" 선택
3. 워크스페이스(조직명/산업) 생성
4. CSV 업로드 → 컬럼 매핑 확인 → 품질검사 통과
5. 분석은 Next.js Server Action이 Epic H의 탐지 엔진을 in-process로 직접 호출한다 — 별도 Edge Function 배포나 로컬 서빙이 필요 없다
6. 결과는 `/workspace/{orgId}/spend/overview`, `/workspace/{orgId}/spend/opportunities`에서 확인 (로그인 필요, 본인 조직만 접근 가능)

데모(`/demo/spend/*`)는 이 플로우와 무관하게 기존 방식 그대로 동작한다.
```

```bash
git add README.md
git commit -m "docs: document the real-customer upload flow"
```

---

## Self-Review 결과

- **스펙 커버리지:** 인증(Task 1,6)=Supabase Auth 이메일/비밀번호, 멀티테넌시(Task 2)=memberships 테이블+RLS, Storage(Task 2,11)=spend-uploads 버킷+service-role 업로드, CSV 파싱/프리뷰(Task 9)=PapaParse, 매핑 추천(Task 4,10)=문자열 유사도, 품질검사(Task 5,11)=Spend 전용 Blocker/Warning/Score, 엔진 재사용(Task 3,11)=in-process 직접 호출, 실데이터 화면(Task 12,13)=Epic H 컴포넌트 재사용, 목표선택 Coming Soon(Task 7)=4개 카드. 스펙의 모든 섹션에 대응하는 Task가 있음 — 갭 없음.
- **Placeholder 스캔:** TODO/TBD 없음. 모든 Step에 실제 코드 포함.
- **타입 일관성:** `SpendTransaction`(엔진, Task 3/11에서 동일하게 사용), `QualityRow`(Task 5/11), `MappingSuggestion`/`StandardField`(Task 4/10), `OnboardingState`(Task 7, 필드명 `organizationId/projectId/file/headers/rows/mapping`이 Task 8~11에서 일관되게 사용됨) 확인 완료.
- **스펙 대비 변경사항:** 엔진 연동 방식이 스펙 초안(Edge Function HTTP 호출)에서 in-process 직접 호출로 계획 수립 중 변경됨 — 스펙 문서도 함께 갱신 완료(`docs/superpowers/specs/2026-09-06-real-upload-pipeline-design.md` Rev.2).
