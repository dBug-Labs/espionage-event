import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import OTP from '@/models/OTP';
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

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if participant exists and is paid
    const participant = await Participant.findOne({
      email: email.trim().toLowerCase(),
      paymentStatus: 'PAID',
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'No verified registration found for this email. Make sure your payment is verified.' },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete old OTPs for this email
    await OTP.deleteMany({ email: email.trim().toLowerCase() });

    // Store new OTP
    await OTP.create({
      email: email.trim().toLowerCase(),
      otp: otpCode,
      expiresAt,
    });

    // Send OTP email
    await transporter.sendMail({
      from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
      to: email.trim(),
      subject: `🔐 Your Access Code — Espionage`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Courier New', monospace; background: #0a0a0f; color: #e6edf3; margin: 0; padding: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: #0d1117; border: 1px solid rgba(0,255,65,0.2); border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #003311, #001a0a); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(0,255,65,0.15);">
      <h1 style="margin: 0; font-size: 28px; color: #00ff41; letter-spacing: 6px;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #7d8590; font-size: 12px; letter-spacing: 2px;">AGENT AUTHENTICATION</p>
    </div>
    <div style="padding: 32px 24px; text-align: center;">
      <p style="color: #7d8590; font-size: 14px; margin-bottom: 8px;">Agent <strong style="color: #e6edf3;">${participant.name}</strong>,</p>
      <p style="color: #7d8590; font-size: 14px; margin-bottom: 24px;">Your one-time access code:</p>
      <div style="background: rgba(0,255,65,0.05); border: 2px solid rgba(0,255,65,0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <span style="font-size: 40px; font-weight: bold; color: #00ff41; letter-spacing: 12px;">${otpCode}</span>
      </div>
      <p style="color: #484f58; font-size: 12px;">This code expires in <strong style="color: #ffb300;">5 minutes</strong>.</p>
      <p style="color: #484f58; font-size: 12px;">Do not share this code with anyone.</p>
    </div>
    <div style="background: #161b22; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(0,255,65,0.1);">
      <p style="color: #484f58; font-size: 11px; margin: 0;">DBUG • Espionage 2026</p>
    </div>
  </div>
</body>
</html>`,
      text: `Your Espionage OTP is: ${otpCode}. It expires in 5 minutes.`,
    });

    return NextResponse.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('[send-otp]', err);
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}
