import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { sendRSVPEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    // Find all participants without an RSVP token
    const participants = await Participant.find({
      $or: [
        { rsvpToken: '' },
        { rsvpToken: { $exists: false } },
      ]
    });

    if (participants.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'All participants already have RSVP tokens. No new emails sent.',
      });
    }

    let sentCount = 0;
    for (const p of participants) {
      // Generate unique RSVP token
      const token = crypto.randomBytes(24).toString('hex');
      p.rsvpToken = token;
      await p.save();

      // Send RSVP email to team leader only
      try {
        await sendRSVPEmail({
          participantId: p.participantId,
          name: p.name,
          email: p.email,
          rsvpToken: token,
          teamType: p.teamType,
          partnerName: p.partner?.name,
        });
        sentCount++;
      } catch (err) {
        console.error(`[send-rsvp] Failed to email ${p.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: participants.length,
      message: `RSVP emails sent to ${sentCount} team leaders.`,
    });
  } catch (err) {
    console.error('[admin/send-rsvp]', err);
    return NextResponse.json({ error: 'Failed to send RSVP emails.' }, { status: 500 });
  }
}
