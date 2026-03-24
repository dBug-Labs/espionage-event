import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function POST(req: NextRequest) {
    try {
        console.log('[register-manual] Received request');
        const body = await req.json();
        const { participant, transactionId } = body;

        if (!participant || !transactionId) {
            console.error('[register-manual] Missing data');
            return NextResponse.json({ error: 'Missing participant data or transaction ID.' }, { status: 400 });
        }

        const { name, email, collegeEmail, regNo, phone } = participant;
        if (!name || !email || !collegeEmail || !regNo || !phone) {
            console.error('[register-manual] Missing fields', participant);
            return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
        }

        await connectToDatabase();

        // Duplicate check
        const existing = await Participant.findOne({ 
            $or: [
                { email: email.trim().toLowerCase() },
                { regNo: regNo.trim().toUpperCase() }
            ]
        });
        
        if (existing) {
            const field = existing.email === email.trim().toLowerCase() ? 'Email' : 'Registration Number';
            return NextResponse.json({ error: `${field} has already been registered.` }, { status: 409 });
        }

        const count = await Participant.countDocuments();
        const participantId = `ESP-${(count + 1).toString().padStart(3, '0')}`;
        const amountPaid = 70;

        const newParticipant = await Participant.create({
            participantId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            collegeEmail: collegeEmail.trim().toLowerCase(),
            regNo: regNo.trim().toUpperCase(),
            phone: phone.trim(),
            amountPaid,
            paymentId: transactionId,
            paymentStatus: 'PENDING',
        });

        console.log('[register-manual] Success:', participantId);

        return NextResponse.json({
            success: true,
            participantId: newParticipant.participantId,
            name: newParticipant.name,
            message: 'Registration submitted. Please wait for admin verification.'
        });
    } catch (err: any) {
        console.error('[register-manual] ERROR:', err);
        return NextResponse.json({ 
            error: 'Failed to submit registration.',
            details: err.message || String(err)
        }, { status: 500 });
    }
}
