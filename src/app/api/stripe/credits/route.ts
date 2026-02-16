import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';

const PACK_CONFIG = {
  '10': {
    priceId: process.env.STRIPE_CREDITS_10_PRICE_ID || 'price_credits_10_placeholder',
    credits: 10,
    amount: 500, // $5 in cents
  },
  '50': {
    priceId: process.env.STRIPE_CREDITS_50_PRICE_ID || 'price_credits_50_placeholder',
    credits: 50,
    amount: 2500, // $25
  },
  '100': {
    priceId: process.env.STRIPE_CREDITS_100_PRICE_ID || 'price_credits_100_placeholder',
    credits: 100,
    amount: 4500, // $45
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    const { pack, userId, email } = await req.json();

    if (!pack || !(pack in PACK_CONFIG)) {
      return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
    }

    const config = PACK_CONFIG[pack as keyof typeof PACK_CONFIG];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${config.credits} Slideshow Credits`,
            description: `${config.credits} credits for TikTok slideshow generation`,
          },
          unit_amount: config.amount,
        },
        quantity: 1,
      }],
      success_url: `${req.nextUrl.origin}/pricing/success?credits=${config.credits}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/pricing`,
      metadata: {
        userId,
        type: 'credit_purchase',
        credits: String(config.credits),
        pack,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
