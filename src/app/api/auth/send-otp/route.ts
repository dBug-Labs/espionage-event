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

    const normalizedEmail = email.trim().toLowerCase();

    // Check if participant exists and has confirmed RSVP (only team leaders can login)
    const participant = await Participant.findOne({
      email: normalizedEmail,
      rsvpStatus: 'CONFIRMED',
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'No RSVP-confirmed registration found for this email. Only team leaders who have confirmed their RSVP can access the dashboard.' },
        { status: 404 }
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const eventDate = process.env.EVENT_DATE || 'TBA';
    const eventTime = process.env.EVENT_TIME || 'TBA';
    const eventVenue = process.env.EVENT_VENUE || 'TBA';

    await OTP.deleteMany({ email: normalizedEmail });

    await OTP.create({
      email: normalizedEmail,
      otp: otpCode,
      expiresAt,
    });

    await transporter.sendMail({
      from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: 'Dashboard Access Code | Espionage',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Space Grotesk', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); box-shadow: 0 0 30px rgba(255, 85, 64, 0.05); overflow: hidden;">
    <div style="background: rgba(255, 85, 64, 0.05); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 85, 64, 0.2);">
      <h1 style="margin: 0; font-size: 36px; color: #FF5540; letter-spacing: 0.2em; font-weight: 900;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #FFB4A8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">Dashboard Access Code</p>
    </div>
    <div style="padding: 40px 30px;">
      <p style="color: #ABAAA9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Agent <strong style="color: #E5E2E1;">${participant.name}</strong>,</p>
      <p style="color: #ABAAA9; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">Use the one-time access code below to enter the event dashboard. This code is valid for a single login session and expires shortly.</p>

      <div style="background: rgba(255, 85, 64, 0.05); border-top: 1px solid rgba(255, 85, 64, 0.2); border-bottom: 1px solid rgba(255, 85, 64, 0.2); padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #FF5540; margin-bottom: 8px; opacity: 0.8;">One-Time Access Code</p>
        <div style="font-size: 40px; font-weight: 900; color: #FF5540; letter-spacing: 0.35em; text-shadow: 0 0 15px rgba(255, 85, 64, 0.4);">${otpCode}</div>
        <p style="font-size: 12px; color: #ABAAA9; margin-top: 12px;">Agent ID: ${participant.participantId}</p>
      </div>

      <div style="background: #1C1C1D; border-left: 3px solid #FF5540; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #E5E2E1;"><strong>DATE:</strong> ${eventDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #E5E2E1;"><strong>TIME:</strong> ${eventTime}</p>
        <p style="margin: 0; font-size: 13px; color: #E5E2E1;"><strong>VENUE:</strong> ${eventVenue}</p>
      </div>

      <p style="color: #ABAAA9; font-size: 12px; text-align: center; line-height: 1.6; margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">
        This code expires in <strong style="color: #FF5540;">5 minutes</strong>. Do not share it with anyone.
      </p>
    </div>
    <div style="background: #0E0E0E; padding: 24px; text-align: center; border-top: 1px solid rgba(255, 85, 64, 0.2);">
      <p style="color: #848383; font-size: 10px; margin: 0; letter-spacing: 0.2em; text-transform: uppercase;">CLASSIFIED DIRECTIVE // EYES ONLY</p>
    </div>
  </div>
</body>
</html>`,
      text: `Agent ${participant.name}, your Espionage dashboard access code is ${otpCode}. It expires in 5 minutes. Event date: ${eventDate}, time: ${eventTime}, venue: ${eventVenue}. Do not share this code.`,
    });

    return NextResponse.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('[send-otp]', err);
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}
