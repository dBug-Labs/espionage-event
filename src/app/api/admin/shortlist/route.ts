import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { sendShortlistEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { password, count } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const topN = count || 30;

    await connectToDatabase();

    // Reset all shortlists first
    await Participant.updateMany({}, { isShortlisted: false });

    // Get top N by round1Score (descending) — no payment filter needed
    const top = await Participant.find({
      round1Score: { $ne: null },
    })
      .sort({ round1Score: -1 })
      .limit(topN);

    const shortlistedIds = top.map((p) => p._id);

    // Mark as shortlisted
    await Participant.updateMany(
      { _id: { $in: shortlistedIds } },
      { isShortlisted: true }
    );

    // Send shortlist emails to ALL participants (leader + partner)
    const emailPromises: Promise<void>[] = [];
    for (const p of top) {
      // Send to team leader
      emailPromises.push(
        sendShortlistEmail({ name: p.name, email: p.email, participantId: p.participantId })
          .catch((e) => console.error(`Failed to send shortlist email to ${p.email}:`, e))
      );

      // Send to partner if duo
      if (p.teamType === 'duo' && p.partner?.email) {
        emailPromises.push(
          sendShortlistEmail({ name: p.partner.name, email: p.partner.email, participantId: p.participantId })
            .catch((e) => console.error(`Failed to send shortlist email to partner ${p.partner!.email}:`, e))
        );
      }
    }
    await Promise.all(emailPromises);

    return NextResponse.json({
      success: true,
      shortlisted: top.length,
      message: `${top.length} teams shortlisted and all members notified via email.`,
    });
  } catch (err) {
    console.error('[admin/shortlist]', err);
    return NextResponse.json({ error: 'Shortlisting failed.' }, { status: 500 });
  }
}
