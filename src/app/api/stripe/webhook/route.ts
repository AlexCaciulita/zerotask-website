import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Use a dedicated Supabase admin client for webhook operations
// Service role key bypasses RLS since webhooks have no user session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get current_period_end from a Stripe subscription.
 * In newer Stripe SDK versions, this field moved from the subscription
 * to the subscription item level.
 */
function getSubscriptionPeriodEnd(sub: Stripe.Subscription): number {
  // Try subscription item level first (newer Stripe SDK)
  const itemPeriodEnd = sub.items?.data?.[0]?.current_period_end;
  if (itemPeriodEnd) return itemPeriodEnd;
  // Fallback: access directly with type assertion (older Stripe SDK)
  return (sub as unknown as { current_period_end: number }).current_period_end ?? Math.floor(Date.now() / 1000);
}

async function upsertSubscription(
  userId: string,
  data: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    plan: string;
    status: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
  }
) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Stripe Webhook] Supabase upsert error:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan || 'pro';

        if (!userId) {
          console.error('[Stripe Webhook] No userId in session metadata');
          break;
        }

        // Handle subscription checkout
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await upsertSubscription(userId, {
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            plan,
            status: subscription.status === 'trialing' ? 'active' : subscription.status,
            current_period_end: new Date(getSubscriptionPeriodEnd(subscription) * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          });

          console.log('[Stripe Webhook] Subscription created:', userId, plan, subscription.status);
        }

        // Handle credit pack purchase
        if (session.mode === 'payment' && session.metadata?.type === 'credit_purchase') {
          const credits = parseInt(session.metadata.credits || '0', 10);
          if (credits > 0) {
            // Add purchased credits to the user's balance
            const { data: existing } = await supabaseAdmin
              .from('credits')
              .select('purchased_credits')
              .eq('user_id', userId)
              .single();

            const currentPurchased = existing?.purchased_credits || 0;

            await supabaseAdmin
              .from('credits')
              .upsert(
                {
                  user_id: userId,
                  purchased_credits: currentPurchased + credits,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
              );

            // Record the transaction
            await supabaseAdmin
              .from('credit_transactions')
              .insert({
                user_id: userId,
                type: 'purchase',
                amount: credits,
                balance_after: currentPurchased + credits,
                description: `Purchased ${credits} credits`,
              });

            console.log('[Stripe Webhook] Credits purchased:', userId, credits);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (!userId) {
          console.warn('[Stripe Webhook] No userId in subscription metadata');
          break;
        }

        // Determine plan from price lookup
        let plan = 'pro';
        const priceId = sub.items.data[0]?.price?.id;
        if (priceId === process.env.STRIPE_CREATOR_PRICE_ID) {
          plan = 'creator';
        }

        await upsertSubscription(userId, {
          stripe_subscription_id: sub.id,
          plan,
          status: sub.status === 'trialing' ? 'active' : sub.status,
          current_period_end: new Date(getSubscriptionPeriodEnd(sub) * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        });

        console.log('[Stripe Webhook] Subscription updated:', userId, sub.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (!userId) {
          console.warn('[Stripe Webhook] No userId in subscription metadata');
          break;
        }

        await upsertSubscription(userId, {
          stripe_subscription_id: sub.id,
          plan: 'free',
          status: 'canceled',
          current_period_end: new Date(getSubscriptionPeriodEnd(sub) * 1000).toISOString(),
          cancel_at_period_end: false,
        });

        console.log('[Stripe Webhook] Subscription deleted:', userId);
        break;
      }
    }
  } catch (error) {
    console.error('[Stripe Webhook] Processing error:', error);
    // Still return 200 so Stripe doesn't retry forever
    // The error is logged for debugging
  }

  return NextResponse.json({ received: true });
}
