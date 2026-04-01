import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import OTP from '@/models/OTP';
import { verifyCaptcha } from '@/lib/captcha';
import { getConfig } from '@/models/EventConfig';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, captchaToken } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // --- CAPTCHA verification ---
    const captchaResult = await verifyCaptcha(captchaToken);
    if (!captchaResult.success) {
      console.warn('[send-otp] Captcha failed:', captchaResult.error);
      return NextResponse.json(
        { error: captchaResult.error || 'Captcha verification failed.' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const config = await getConfig();

    if (!config.registrationOpen) {
      return NextResponse.json({ error: 'Registration is currently closed.' }, { status: 403 });
    }

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Generate and save OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OTP.create({
      email: normalizedEmail,
      otp: otpCode,
      expiresAt,
      verified: false,
    });

    // Send OTP email
    await transporter.sendMail({
      from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: `🔐 Your OTP Code — Espionage Registration`,
      text: `Your OTP for Espionage registration is: ${otpCode}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); overflow: hidden;">
    <div style="background: rgba(255, 85, 64, 0.05); padding: 30px 24px; text-align: center; border-bottom: 1px solid rgba(255, 85, 64, 0.2);">
      <h1 style="margin: 0; font-size: 28px; color: #FF5540; letter-spacing: 0.2em; font-weight: 900;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #FFB4A8; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;">IDENTITY VERIFICATION</p>
    </div>
    <div style="padding: 40px 24px; text-align: center;">
      <p style="color: #ABAAA9; font-size: 13px; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.1em;">Your verification code is:</p>
      <div style="background: rgba(255, 85, 64, 0.08); border: 2px solid rgba(255, 85, 64, 0.3); padding: 24px; margin: 0 auto 24px; display: inline-block;">
        <div style="font-size: 42px; font-weight: 900; color: #FF5540; letter-spacing: 0.4em; font-family: monospace; text-shadow: 0 0 20px rgba(255, 85, 64, 0.4);">${otpCode}</div>
      </div>
      <p style="color: #848383; font-size: 11px; letter-spacing: 0.05em;">This code expires in <strong style="color: #FF5540;">5 minutes</strong>.</p>
      <p style="color: #848383; font-size: 11px; margin-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 16px;">If you did not request this code, ignore this email.</p>
    </div>
    <div style="background: #0E0E0E; padding: 16px; text-align: center; border-top: 1px solid rgba(255, 85, 64, 0.2);">
      <p style="color: #848383; font-size: 9px; margin: 0; letter-spacing: 0.2em; text-transform: uppercase;">CLASSIFIED DIRECTIVE // EYES ONLY</p>
    </div>
  </div>
</body>
</html>`,
    });

    console.log(`[send-otp] OTP sent to ${normalizedEmail}`);
    return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err: unknown) {
    console.error('[send-otp] ERROR:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to send OTP.', details: message }, { status: 500 });
  }
}
