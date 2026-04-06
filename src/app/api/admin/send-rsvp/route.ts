import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { sendRSVPEmail } from '@/lib/mailer';
import crypto from 'crypto';

const RSVP_SEND_BATCH_SIZE = 12;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    // Find all participants without an RSVP token
    const participants = await Participant.find({
      rsvpStatus: 'PENDING',
      $or: [
        { rsvpToken: '' },
        { rsvpToken: { $exists: false } },
      ],
    }).lean();

    if (participants.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'All participants already have RSVP tokens. No new emails sent.',
      });
    }

    let sentCount = 0;
    const failedRecipients: string[] = [];

    for (const batch of chunk(participants, RSVP_SEND_BATCH_SIZE)) {
      const results = await Promise.all(
        batch.map(async (participant) => {
          const token = crypto.randomBytes(24).toString('hex');

          try {
            await sendRSVPEmail({
              participantId: participant.participantId,
              name: participant.name,
              email: participant.email,
              rsvpToken: token,
              teamType: participant.teamType,
              partnerName: participant.partner?.name,
            });

            return { ok: true, participant, token };
          } catch (err) {
            console.error(`[send-rsvp] Failed to email ${participant.email}:`, err);
            return { ok: false, participant, token };
          }
        })
      );

      const successful = results.filter((result) => result.ok);
      if (successful.length > 0) {
        await Participant.bulkWrite(
          successful.map((result) => ({
            updateOne: {
              filter: { _id: result.participant._id },
              update: { $set: { rsvpToken: result.token } },
            },
          }))
        );
      }

      sentCount += successful.length;
      failedRecipients.push(
        ...results.filter((result) => !result.ok).map((result) => result.participant.email)
      );
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedRecipients.length,
      total: participants.length,
      failedRecipients: failedRecipients.slice(0, 20),
      message:
        failedRecipients.length > 0
          ? `RSVP emails sent to ${sentCount} team leaders. ${failedRecipients.length} failed and can be retried safely.`
          : `RSVP emails sent to ${sentCount} team leaders.`,
    });
  } catch (err) {
    console.error('[admin/send-rsvp]', err);
    return NextResponse.json({ error: 'Failed to send RSVP emails.' }, { status: 500 });
  }
}
