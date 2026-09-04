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
