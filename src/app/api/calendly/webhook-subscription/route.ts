import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/calendly/webhook-subscription
 * Registers a Calendly webhook to receive invitee.created events.
 * Call this once after deploying to set up the webhook.
 *
 * GET /api/calendly/webhook-subscription
 * Lists current webhook subscriptions.
 */

export async function POST(req: Request) {
  const apiKey = process.env.CALENDLY_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey) {
    return NextResponse.json({ error: 'CALENDLY_API_KEY not configured' }, { status: 400 });
  }
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 400 });
  }

  try {
    // Get current user to find organization URI
    const userRes = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const userData = await userRes.json();
    const userUri = userData.resource?.uri;
    const orgUri = userData.resource?.current_organization;

    if (!userUri || !orgUri) {
      return NextResponse.json({ error: 'Could not fetch Calendly user/org' }, { status: 500 });
    }

    const webhookUrl = `${appUrl}/api/webhooks/calendly`;

    // Check if webhook already exists
    const existingRes = await fetch(
      `https://api.calendly.com/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=user&user=${encodeURIComponent(userUri)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const existingData = await existingRes.json();
    const existing = (existingData.collection || []).find(
      (w: any) => w.callback_url === webhookUrl
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Webhook already registered',
        webhook: {
          uri: existing.uri,
          callbackUrl: existing.callback_url,
          events: existing.events,
          state: existing.state,
        },
      });
    }

    // Create new webhook subscription
    const createRes = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['invitee.created', 'invitee.canceled'],
        organization: orgUri,
        user: userUri,
        scope: 'user',
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      return NextResponse.json({
        error: 'Failed to create webhook subscription',
        details: createData,
      }, { status: createRes.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook registered successfully',
      webhook: {
        uri: createData.resource?.uri,
        callbackUrl: createData.resource?.callback_url,
        events: createData.resource?.events,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'CALENDLY_API_KEY not configured' }, { status: 400 });
  }

  try {
    const userRes = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const userData = await userRes.json();
    const userUri = userData.resource?.uri;
    const orgUri = userData.resource?.current_organization;

    if (!orgUri) {
      return NextResponse.json({ error: 'Could not fetch Calendly organization' }, { status: 500 });
    }

    const subsRes = await fetch(
      `https://api.calendly.com/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=user&user=${encodeURIComponent(userUri!)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const subsData = await subsRes.json();

    return NextResponse.json({
      subscriptions: (subsData.collection || []).map((w: any) => ({
        uri: w.uri,
        callbackUrl: w.callback_url,
        events: w.events,
        state: w.state,
        createdAt: w.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
