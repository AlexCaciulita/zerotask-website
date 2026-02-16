import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

let cachedToken: { token: string; expires: number } | null = null;

function generateToken(): string {
  if (cachedToken && Date.now() < cachedToken.expires - 60_000) {
    return cachedToken.token;
  }

  const privateKeyPath = path.resolve(process.cwd(), process.env.APPLE_PRIVATE_KEY_PATH || './AuthKey_XUGG66V6D4.p8');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 20 * 60;

  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    issuer: process.env.APPLE_ISSUER_ID!,
    expiresIn: '20m',
    audience: 'appstoreconnect-v1',
    header: {
      alg: 'ES256',
      kid: process.env.APPLE_KEY_ID!,
      typ: 'JWT',
    },
  });

  cachedToken = { token, expires: exp * 1000 };
  return token;
}

const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

async function apiRequest(endpoint: string, options?: RequestInit) {
  const token = generateToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`App Store Connect API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res;
}

export interface AppInfo {
  id: string;
  name: string;
  bundleId: string;
  sku: string;
  primaryLocale: string;
}

export async function getApps(): Promise<AppInfo[]> {
  const res = await apiRequest('/apps?fields[apps]=name,bundleId,sku,primaryLocale');
  const data = await res.json();
  return (data.data || []).map((app: Record<string, unknown>) => ({
    id: app.id as string,
    name: (app.attributes as Record<string, string>)?.name || '',
    bundleId: (app.attributes as Record<string, string>)?.bundleId || '',
    sku: (app.attributes as Record<string, string>)?.sku || '',
    primaryLocale: (app.attributes as Record<string, string>)?.primaryLocale || '',
  }));
}

export interface SalesReportRow {
  provider: string;
  providerCountry: string;
  sku: string;
  developer: string;
  title: string;
  version: string;
  productTypeIdentifier: string;
  units: number;
  developerProceeds: number;
  currency: string;
  countryCode: string;
  beginDate: string;
  endDate: string;
}

export async function getSalesReport(vendorNumber: string, reportDate: string, frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY'): Promise<SalesReportRow[]> {
  const params = new URLSearchParams({
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[frequency]': frequency,
    'filter[vendorNumber]': vendorNumber,
    'filter[reportDate]': reportDate,
  });

  try {
    const res = await apiRequest(`/salesReports?${params}`);
    // Response is gzipped TSV
    const buffer = await res.arrayBuffer();
    const { gunzipSync } = await import('zlib');
    const text = gunzipSync(Buffer.from(buffer)).toString('utf8');
    
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split('\t');
    const unitIdx = headers.findIndex(h => h.trim().toLowerCase() === 'units');
    const proceedsIdx = headers.findIndex(h => h.trim().toLowerCase().includes('developer proceeds'));
    const titleIdx = headers.findIndex(h => h.trim().toLowerCase() === 'title');
    const skuIdx = headers.findIndex(h => h.trim().toLowerCase() === 'sku');
    const currencyIdx = headers.findIndex(h => h.trim().toLowerCase().includes('currency'));
    const countryIdx = headers.findIndex(h => h.trim().toLowerCase().includes('country code'));
    const beginIdx = headers.findIndex(h => h.trim().toLowerCase().includes('begin date'));
    const endIdx = headers.findIndex(h => h.trim().toLowerCase().includes('end date'));

    return lines.slice(1).map(line => {
      const cols = line.split('\t');
      return {
        provider: cols[0] || '',
        providerCountry: cols[1] || '',
        sku: cols[skuIdx] || '',
        developer: cols[3] || '',
        title: cols[titleIdx] || '',
        version: cols[5] || '',
        productTypeIdentifier: cols[6] || '',
        units: parseFloat(cols[unitIdx] || '0') || 0,
        developerProceeds: parseFloat(cols[proceedsIdx] || '0') || 0,
        currency: cols[currencyIdx] || 'USD',
        countryCode: cols[countryIdx] || '',
        beginDate: cols[beginIdx] || reportDate,
        endDate: cols[endIdx] || reportDate,
      };
    });
  } catch (err) {
    // Sales reports often return 404 for dates with no data
    if (err instanceof Error && err.message.includes('404')) return [];
    throw err;
  }
}

export async function getAppDetails(appId: string) {
  const res = await apiRequest(`/apps/${appId}?fields[apps]=name,bundleId,sku,primaryLocale`);
  const data = await res.json();
  return data.data;
}

export async function getCustomerReviews(appId: string, limit = 20) {
  try {
    const res = await apiRequest(`/apps/${appId}/customerReviews?limit=${limit}&sort=-createdDate`);
    const data = await res.json();
    return (data.data || []).map((r: Record<string, unknown>) => {
      const attrs = r.attributes as Record<string, unknown>;
      return {
        id: r.id,
        rating: attrs?.rating,
        title: attrs?.title,
        body: attrs?.body,
        reviewerNickname: attrs?.reviewerNickname,
        createdDate: attrs?.createdDate,
      };
    });
  } catch {
    return [];
  }
}

export function isConfigured(): boolean {
  return !!(process.env.APPLE_ISSUER_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY_PATH);
}
