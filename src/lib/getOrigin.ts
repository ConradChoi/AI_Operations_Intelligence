import { headers } from 'next/headers';

// AWS Amplify 등 일부 서버리스 호스팅은 내부 프록시 홉에서 host 헤더를
// 실제 공개 도메인이 아닌 값(예: localhost)으로 넘기는 경우가 있다. 배포 시
// NEXT_PUBLIC_SITE_URL을 명시적으로 설정해두면 헤더 추정보다 그 값을 우선한다.
export function getRequestOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const headersList = headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') ?? 'http';
  return `${protocol}://${host}`;
}
