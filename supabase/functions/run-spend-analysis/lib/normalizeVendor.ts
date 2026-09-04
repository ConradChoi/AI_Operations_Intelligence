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
