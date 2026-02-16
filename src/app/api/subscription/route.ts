import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/subscription — returns the current user's subscription status from the database
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createServerSupabaseClient(auth.accessToken);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status, stripe_customer_id, current_period_end, cancel_at_period_end')
      .eq('user_id', auth.user.id)
      .single();

    if (error || !data) {
      // No subscription record — user is on free plan
      return NextResponse.json({
        plan: 'free',
        status: 'none',
        stripeCustomerId: null,
        expiresAt: null,
      });
    }

    // Check if subscription has expired
    if (data.current_period_end && new Date(data.current_period_end) < new Date()) {
      // Period has ended — if not renewed, treat as free
      if (data.status !== 'active') {
        return NextResponse.json({
          plan: 'free',
          status: 'expired',
          stripeCustomerId: data.stripe_customer_id,
          expiresAt: data.current_period_end,
        });
      }
    }

    return NextResponse.json({
      plan: data.plan,
      status: data.status,
      stripeCustomerId: data.stripe_customer_id,
      expiresAt: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
}
