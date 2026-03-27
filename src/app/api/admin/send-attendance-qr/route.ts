import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { sendAttendanceQREmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    // Get all RSVP-confirmed participants
    const confirmed = await Participant.find({ rsvpStatus: 'CONFIRMED' });

    if (confirmed.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No RSVP-confirmed participants found.',
      });
    }

    let sentCount = 0;
    for (const p of confirmed) {
      // Send attendance QR email to team leader
      try {
        await sendAttendanceQREmail({
          participantId: p.participantId,
          name: p.name,
          email: p.email,
        });
        sentCount++;

        // Also send to partner if duo (just a simple notification, not QR)
        if (p.teamType === 'duo' && p.partner?.email) {
          await sendAttendanceQREmail({
            participantId: p.participantId,
            name: p.partner.name,
            email: p.partner.email,
          });
          sentCount++;
        }
      } catch (err) {
        console.error(`[send-attendance-qr] Failed for ${p.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      teams: confirmed.length,
      message: `Attendance QR emails sent to ${sentCount} participants across ${confirmed.length} teams.`,
    });
  } catch (err) {
    console.error('[admin/send-attendance-qr]', err);
    return NextResponse.json({ error: 'Failed to send attendance QR emails.' }, { status: 500 });
  }
}
