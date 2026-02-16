import { NextRequest, NextResponse } from 'next/server';
import { getApps, getSalesReport, getCustomerReviews, isConfigured } from '@/lib/app-store-connect';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    if (!isConfigured()) {
      return NextResponse.json({ error: 'App Store Connect not configured. Add APPLE_ISSUER_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY_PATH to .env.local' }, { status: 400 });
    }

    const body = await req.json();
    const { action, appId, vendorNumber, period } = body;

    switch (action) {
      case 'apps': {
        const apps = await getApps();
        return NextResponse.json({ apps });
      }

      case 'downloads': {
        if (!vendorNumber) {
          return NextResponse.json({ error: 'vendorNumber is required for sales reports' }, { status: 400 });
        }
        const days = period === 'month' ? 30 : 7;
        const reports = [];
        for (let i = 2; i <= days + 1; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          try {
            const rows = await getSalesReport(vendorNumber, dateStr);
            const filtered = appId ? rows.filter(r => r.sku === appId || r.title.toLowerCase().includes(appId.toLowerCase())) : rows;
            const totalUnits = filtered.reduce((sum, r) => sum + r.units, 0);
            const totalRevenue = filtered.reduce((sum, r) => sum + r.developerProceeds, 0);
            reports.push({ date: dateStr, units: totalUnits, revenue: totalRevenue });
          } catch {
            reports.push({ date: dateStr, units: 0, revenue: 0 });
          }
        }
        const totalDownloads = reports.reduce((s, r) => s + r.units, 0);
        const totalRevenue = reports.reduce((s, r) => s + r.revenue, 0);
        return NextResponse.json({ reports, totalDownloads, totalRevenue });
      }

      case 'reviews': {
        if (!appId) {
          return NextResponse.json({ error: 'appId is required' }, { status: 400 });
        }
        const reviews = await getCustomerReviews(appId);
        const avgRating = reviews.length > 0
          ? reviews.reduce((s: number, r: { rating: number }) => s + (r.rating || 0), 0) / reviews.length
          : 0;
        return NextResponse.json({ reviews, avgRating, count: reviews.length });
      }

      case 'status': {
        return NextResponse.json({ configured: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Analytics API error:', message);
    
    if (message.includes('401') || message.includes('403')) {
      return NextResponse.json({ error: 'Invalid or expired App Store Connect credentials. Check your API key.' }, { status: 401 });
    }
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
