import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/webhooks/calendly
 *
 * Receives Calendly webhook events (invitee.created) when someone books a meeting.
 * Creates a new Lead with stage "booked" or updates an existing lead's stage.
 *
 * Setup: In Calendly → Integrations → Webhooks, subscribe to "invitee.created"
 * and point it to: https://<your-domain>/api/webhooks/calendly
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Calendly sends { event, payload } for webhook v2
    const event = body.event;
    const payload = body.payload;

    // Handle cancellations
    if (event === 'invitee.canceled') {
      return handleCancellation(payload);
    }

    // Only handle invitee.created (new booking)
    if (event !== 'invitee.created') {
      return NextResponse.json({ received: true, skipped: event });
    }

    // Extract invitee data from Calendly payload
    const invitee = payload?.invitee || payload;
    const scheduledEvent = payload?.scheduled_event || payload?.event || {};

    const email = invitee?.email || invitee?.invitee_email || null;
    const name = invitee?.name || invitee?.invitee_name || '';
    const phone = invitee?.text_reminder_number || null;
    const meetingName = scheduledEvent?.name || scheduledEvent?.event_type?.name || 'Strategy Call';
    const meetingStartTime = scheduledEvent?.start_time || scheduledEvent?.start_time_pretty || null;
    const meetingEndTime = scheduledEvent?.end_time || null;
    const calendlyEventUri = scheduledEvent?.uri || null;
    const inviteeUri = invitee?.uri || null;

    // Extract answers to custom questions (if any)
    const questionsAndAnswers = invitee?.questions_and_answers || [];
    const company = questionsAndAnswers.find(
      (q: any) => q.question?.toLowerCase().includes('company')
    )?.answer || null;

    if (!email && !name) {
      return NextResponse.json(
        { error: 'No invitee email or name in payload' },
        { status: 400 }
      );
    }

    // Check if lead already exists by email
    const existingLead = email
      ? await prisma.lead.findFirst({ where: { email } })
      : null;

    if (existingLead) {
      // Update existing lead to "booked" stage and bump score
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          stage: 'booked',
          score: Math.min((existingLead.score || 0) + 30, 100),
          notes: [
            existingLead.notes,
            `Booked: ${meetingName} on ${meetingStartTime || 'N/A'}`,
          ].filter(Boolean).join(' | '),
        },
      });

      // Log booking interaction
      await prisma.interaction.create({
        data: {
          leadId: existingLead.id,
          type: 'calendly_booking',
          content: `Booked "${meetingName}" via Calendly${meetingStartTime ? ` for ${meetingStartTime}` : ''}`,
          metadata: JSON.stringify({
            calendlyEventUri,
            inviteeUri,
            meetingName,
            startTime: meetingStartTime,
            endTime: meetingEndTime,
            questionsAndAnswers,
          }),
        },
      });

      // Push booking update to HubSpot
      const hubspotKey = process.env.HUBSPOT_API_KEY;
      if (hubspotKey && email) {
        pushBookingToHubSpot(hubspotKey, email, meetingName, meetingStartTime).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        leadId: existingLead.id,
        action: 'updated',
        stage: 'booked',
      });
    }

    // Create new lead with stage "booked"
    const lead = await prisma.lead.create({
      data: {
        name: name || 'Unknown',
        email: email || null,
        company: company || null,
        phone: phone || null,
        source: 'calendly',
        channel: 'booking',
        stage: 'booked',
        score: 50, // booking = high intent
        segment: 'growth',
        notes: `Booked: ${meetingName} on ${meetingStartTime || 'N/A'}`,
        enrichmentData: JSON.stringify({
          calendlyEventUri,
          inviteeUri,
          meetingName,
          startTime: meetingStartTime,
          endTime: meetingEndTime,
          questionsAndAnswers,
          bookedAt: new Date().toISOString(),
        }),
      },
    });

    // Log booking interaction
    await prisma.interaction.create({
      data: {
        leadId: lead.id,
        type: 'calendly_booking',
        content: `Booked "${meetingName}" via Calendly${meetingStartTime ? ` for ${meetingStartTime}` : ''}`,
        metadata: JSON.stringify({
          calendlyEventUri,
          inviteeUri,
          meetingName,
          startTime: meetingStartTime,
          endTime: meetingEndTime,
          questionsAndAnswers,
        }),
      },
    });

    // Push to HubSpot
    const hubspotKey = process.env.HUBSPOT_API_KEY;
    if (hubspotKey && email) {
      pushBookingToHubSpot(hubspotKey, email, meetingName, meetingStartTime).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      action: 'created',
      stage: 'booked',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[calendly webhook] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to process Calendly webhook' },
      { status: 500 }
    );
  }
}

/** Push booking info to HubSpot as a note/timeline event */
async function pushBookingToHubSpot(
  apiKey: string,
  email: string,
  meetingName: string,
  startTime: string | null,
) {
  // First find the contact by email
  const searchRes = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: 'email', operator: 'EQ', value: email }],
        }],
      }),
    }
  );

  const searchData = await searchRes.json();
  const contactId = searchData?.results?.[0]?.id;

  if (contactId) {
    // Update contact lifecycle stage
    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          lifecyclestage: 'salesqualifiedlead',
          notes_last_updated: `Booked ${meetingName}${startTime ? ` for ${startTime}` : ''} via Calendly`,
        },
      }),
    });
  }
}

/** Handle invitee.canceled — revert lead stage and log cancellation */
async function handleCancellation(payload: any) {
  const invitee = payload?.invitee || payload;
  const email = invitee?.email || invitee?.invitee_email || null;
  const reason = invitee?.cancellation?.reason || 'No reason provided';

  if (!email) {
    return NextResponse.json({ received: true, message: 'No email in cancellation' });
  }

  const lead = await prisma.lead.findFirst({ where: { email } });
  if (!lead) {
    return NextResponse.json({ received: true, message: 'Lead not found' });
  }

  // Revert stage to "contacted" (they were interested but canceled)
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      stage: 'contacted',
      score: Math.max((lead.score || 0) - 15, 0),
    },
  });

  await prisma.interaction.create({
    data: {
      leadId: lead.id,
      type: 'calendly_canceled',
      content: `Canceled Calendly booking. Reason: ${reason}`,
      metadata: JSON.stringify({ reason, canceledAt: new Date().toISOString() }),
    },
  });

  return NextResponse.json({ success: true, leadId: lead.id, action: 'canceled' });
}
