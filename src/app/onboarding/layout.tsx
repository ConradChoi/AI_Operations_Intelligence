import type { ReactNode } from 'react';
import { OnboardingProvider } from './OnboardingContext';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
