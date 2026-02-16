import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    const { email, userId, plan = 'pro' } = await req.json();

    const priceId = plan === 'creator'
      ? process.env.STRIPE_CREATOR_PRICE_ID!
      : process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID!;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/pricing`,
      metadata: { userId, plan },
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
