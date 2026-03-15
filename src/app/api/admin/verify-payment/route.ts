import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { sendConfirmationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { participantId } = await req.json();

        await connectToDatabase();

        const participant = await Participant.findOneAndUpdate(
            { participantId },
            { paymentStatus: 'PAID' },
            { new: true }
        );

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        // Send confirmation email
        await sendConfirmationEmail({
            participantId: participant.participantId,
            name: participant.name,
            email: participant.email,
            amountPaid: participant.amountPaid,
        }).catch((err) => console.error('[mailer]', err));

        return NextResponse.json({ success: true, participant });
    } catch (err) {
        console.error('[admin/verify-payment]', err);
        return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
}
