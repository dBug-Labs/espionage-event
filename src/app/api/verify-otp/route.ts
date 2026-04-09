import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import OTP from '@/models/OTP';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import crypto from 'crypto';
import { isOtpPaused, pausedResponse } from '@/lib/accessControl';

export async function POST(req: NextRequest) {
  try {
    if (isOtpPaused()) {
      return pausedResponse('OTP verification is temporarily paused.');
    }

    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- Rate limiting: 5 verify attempts per email per 15 min ---
    const verifyLimit = checkRateLimit({
      prefix: 'otp-verify',
      identifier: normalizedEmail,
      maxRequests: 5,
      windowSeconds: 900, // 15 minutes
    });
    if (!verifyLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // --- Rate limiting: per IP ---
    const clientIP = getClientIP(req);
    const ipLimit = checkRateLimit({
      prefix: 'otp-verify-ip',
      identifier: clientIP,
      maxRequests: 10,
      windowSeconds: 900,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts from this device. Try again later.' },
        { status: 429 }
      );
    }

    await connectToDatabase();

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      otp: otp.trim(),
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark as verified and generate verification token
    const verificationToken = crypto.randomUUID();
    otpRecord.verified = true;
    otpRecord.otp = verificationToken; // Repurpose otp field to store token
    otpRecord.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Token valid for 15 min
    await otpRecord.save();

    console.log(`[verify-otp] Email verified: ${normalizedEmail}`);
    return NextResponse.json({
      success: true,
      verificationToken,
      message: 'Email verified successfully.',
    });
  } catch (err: unknown) {
    console.error('[verify-otp] ERROR:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Verification failed.', details: message }, { status: 500 });
  }
}
