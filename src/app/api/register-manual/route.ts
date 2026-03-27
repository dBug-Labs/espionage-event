import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { sendRegistrationConfirmationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
    try {
        console.log('[register-manual] Received request');
        const body = await req.json();
        const { participant, teamType, partner } = body;

        if (!participant) {
            console.error('[register-manual] Missing data');
            return NextResponse.json({ error: 'Missing participant data.' }, { status: 400 });
        }

        const { name, email, collegeEmail, regNo, phone } = participant;
        if (!name || !email || !collegeEmail || !regNo || !phone) {
            console.error('[register-manual] Missing fields', participant);
            return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
        }

        // Validate teamType
        const resolvedTeamType = teamType === 'duo' ? 'duo' : 'solo';

        // Validate partner if duo
        if (resolvedTeamType === 'duo') {
            if (!partner || !partner.name || !partner.email || !partner.collegeEmail || !partner.regNo || !partner.phone) {
                return NextResponse.json({ error: 'All partner fields are required for duo registration.' }, { status: 400 });
            }
        }

        await connectToDatabase();

        // Duplicate check on leader
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

        // Duplicate check on partner (if duo)
        if (resolvedTeamType === 'duo' && partner) {
            const existingPartner = await Participant.findOne({
                $or: [
                    { email: partner.email.trim().toLowerCase() },
                    { regNo: partner.regNo.trim().toUpperCase() },
                    { 'partner.email': partner.email.trim().toLowerCase() },
                    { 'partner.regNo': partner.regNo.trim().toUpperCase() },
                ]
            });

            if (existingPartner) {
                return NextResponse.json({ error: 'Partner email or registration number has already been registered.' }, { status: 409 });
            }

            // Also check if partner's details match the leader of another team
            const partnerAsLeader = await Participant.findOne({
                $or: [
                    { email: partner.email.trim().toLowerCase() },
                    { regNo: partner.regNo.trim().toUpperCase() },
                ]
            });
            if (partnerAsLeader) {
                return NextResponse.json({ error: 'Your partner is already registered as a team leader.' }, { status: 409 });
            }
        }

        const count = await Participant.countDocuments();
        const participantId = `ESP-${(count + 1).toString().padStart(3, '0')}`;

        const newParticipant = await Participant.create({
            participantId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            collegeEmail: collegeEmail.trim().toLowerCase(),
            regNo: regNo.trim().toUpperCase(),
            phone: phone.trim(),
            teamType: resolvedTeamType,
            partner: resolvedTeamType === 'duo' && partner ? {
                name: partner.name.trim(),
                email: partner.email.trim().toLowerCase(),
                collegeEmail: partner.collegeEmail.trim().toLowerCase(),
                regNo: partner.regNo.trim().toUpperCase(),
                phone: partner.phone.trim(),
            } : undefined,
        });

        console.log('[register-manual] Success:', participantId);

        // Send confirmation emails
        const allEmails = [{ name: name.trim(), email: email.trim().toLowerCase() }];
        if (resolvedTeamType === 'duo' && partner) {
            allEmails.push({ name: partner.name.trim(), email: partner.email.trim().toLowerCase() });
        }

        // Send to all participants (leader + partner)
        for (const person of allEmails) {
            sendRegistrationConfirmationEmail({
                participantId: newParticipant.participantId,
                name: person.name,
                email: person.email,
                teamType: resolvedTeamType,
                leaderName: name.trim(),
                partnerName: resolvedTeamType === 'duo' && partner ? partner.name.trim() : undefined,
            }).catch((err) => console.error('[mailer] Registration email error:', err));
        }

        return NextResponse.json({
            success: true,
            participantId: newParticipant.participantId,
            name: newParticipant.name,
            teamType: resolvedTeamType,
            message: 'Registration successful! Check your email for confirmation.'
        });
    } catch (err: unknown) {
        console.error('[register-manual] ERROR:', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
            error: 'Failed to submit registration.',
            details: message
        }, { status: 500 });
    }
}
