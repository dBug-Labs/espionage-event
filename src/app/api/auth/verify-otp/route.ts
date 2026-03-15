import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import OTP from '@/models/OTP';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required.' }, { status: 400 });
    }

    await connectToDatabase();

    const otpRecord = await OTP.findOne({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      verified: false,
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 401 });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 401 });
    }

    // Mark as verified and clean up
    await OTP.deleteMany({ email: email.trim().toLowerCase() });

    // Get participant data
    const participant = await Participant.findOne({
      email: email.trim().toLowerCase(),
      paymentStatus: 'PAID',
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    }

    // Generate a simple session token
    const token = crypto.randomBytes(32).toString('hex');

    return NextResponse.json({
      success: true,
      session: {
        participantId: participant.participantId,
        name: participant.name,
        email: participant.email,
        isShortlisted: participant.isShortlisted,
        token,
      },
    });
  } catch (err) {
    console.error('[verify-otp]', err);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}
