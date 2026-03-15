import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface ParticipantEmailData {
  participantId: string;
  name: string;
  email: string;
  amountPaid: number;
}

export async function sendConfirmationEmail(participant: ParticipantEmailData) {
  const qrDataUrl = await QRCode.toDataURL(participant.participantId, { width: 200, margin: 2 });

  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || '#';
  const eventDate = process.env.EVENT_DATE || 'TBA';
  const eventTime = process.env.EVENT_TIME || 'TBA';
  const eventVenue = process.env.EVENT_VENUE || 'TBA';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Courier New', monospace; background: #0a0a0f; color: #e6edf3; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #0d1117; border: 1px solid rgba(0,255,65,0.2); border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #003311 0%, #001a0a 100%); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(0,255,65,0.15);">
      <h1 style="margin: 0; font-size: 32px; color: #00ff41; letter-spacing: 6px;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #7d8590; font-size: 12px; letter-spacing: 2px;">MISSION CONFIRMED</p>
    </div>
    <div style="padding: 32px 30px;">
      <p style="color: #7d8590; font-size: 14px;">Agent <strong style="color: #e6edf3;">${participant.name}</strong>,</p>
      <p style="color: #7d8590; font-size: 14px; margin-bottom: 24px;">Your enrollment has been verified. You are now cleared for Operation Espionage. 🕵️</p>

      <div style="background: linear-gradient(135deg, #003311, #001a0a); border: 2px solid rgba(0,255,65,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: rgba(0,255,65,0.5); margin-bottom: 8px;">Agent ID</p>
        <div style="font-size: 32px; font-weight: bold; color: #00ff41; letter-spacing: 6px;">${participant.participantId}</div>
      </div>

      <div style="margin: 20px 0;">
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #00ff41; margin-bottom: 10px; border-bottom: 1px solid #1a1f2e; padding-bottom: 6px;">Amount Verified</p>
        <p style="font-size: 24px; font-weight: bold; color: #22c55e;">₹${participant.amountPaid}</p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <img src="cid:participant-qr-code" alt="QR Code" style="width: 160px; height: 160px; border: 3px solid rgba(0,255,65,0.3); border-radius: 8px;" />
        <p style="color: #484f58; font-size: 12px; margin-top: 8px;">Show this QR at the entry point for verification</p>
      </div>

      <div style="background: #161b22; border: 1px solid #1a1f2e; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; font-size: 14px; color: #7d8590;">📅 <strong style="color: #e6edf3;">Date:</strong> ${eventDate}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #7d8590;">⏰ <strong style="color: #e6edf3;">Time:</strong> ${eventTime}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #7d8590;">📍 <strong style="color: #e6edf3;">Venue:</strong> ${eventVenue}</p>
      </div>

      <a href="${whatsappLink}" style="display: block; background: linear-gradient(135deg, #25D366, #128C7E); color: white; text-align: center; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 24px 0;">📱 Join Mission WhatsApp Group</a>

      <p style="color: #484f58; font-size: 13px;">Keep your Agent ID <strong style="color: #00ff41;">${participant.participantId}</strong> and QR code ready on mission day. Use your registered email to login to the dashboard.</p>
    </div>
    <div style="background: #161b22; padding: 20px 30px; text-align: center; border-top: 1px solid #1a1f2e;">
      <p style="color: #484f58; font-size: 12px; margin: 0;">DBUG • Espionage 2026</p>
    </div>
  </div>
</body>
</html>`;

  const textBody = `
Agent ${participant.name},

Your enrollment for Espionage has been verified!

Agent ID: ${participant.participantId}
Amount Paid: ₹${participant.amountPaid}

Event Details:
Date: ${eventDate}
Time: ${eventTime}
Venue: ${eventVenue}

Join WhatsApp Group: ${whatsappLink}

Use your registered email to login to the dashboard.

DBUG • Espionage 2026
  `;

  await transporter.sendMail({
    from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
    to: participant.email,
    subject: `🕵️ Mission Confirmed — Agent ${participant.participantId} | Espionage`,
    text: textBody,
    html: htmlBody,
    attachments: [
      {
        filename: 'qr-code.png',
        content: qrDataUrl.split('base64,')[1],
        encoding: 'base64',
        cid: 'participant-qr-code',
      },
    ],
  });
}

export async function sendShortlistEmail(participant: { name: string; email: string; participantId: string }) {
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Courier New', monospace; background: #0a0a0f; color: #e6edf3; margin: 0; padding: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: #0d1117; border: 1px solid rgba(0,255,65,0.2); border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #003311, #001a0a); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(0,255,65,0.15);">
      <h1 style="margin: 0; font-size: 28px; color: #00ff41; letter-spacing: 6px;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #ffb300; font-size: 14px; letter-spacing: 2px; font-weight: bold;">⚡ CLASSIFIED BRIEFING</p>
    </div>
    <div style="padding: 32px 24px; text-align: center;">
      <p style="color: #7d8590; font-size: 14px; margin-bottom: 8px;">Agent <strong style="color: #e6edf3;">${participant.name}</strong>,</p>
      <p style="color: #e6edf3; font-size: 18px; font-weight: bold; margin-bottom: 24px;">You have been shortlisted for <span style="color: #00ff41;">Round 2</span>!</p>
      <div style="background: rgba(0,255,65,0.05); border: 2px solid rgba(0,255,65,0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #00ff41; font-size: 16px; font-weight: bold;">🎯 THE FINAL HACK</p>
        <p style="color: #7d8590; font-size: 13px; margin-top: 8px;">Login to your dashboard to access the Code Editor and complete the final mission.</p>
      </div>
      <p style="color: #484f58; font-size: 12px;">Use your registered email to login at the event dashboard.</p>
    </div>
    <div style="background: #161b22; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(0,255,65,0.1);">
      <p style="color: #484f58; font-size: 11px; margin: 0;">DBUG • Espionage 2026</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
    to: participant.email,
    subject: `⚡ You're Shortlisted for Round 2 — Agent ${participant.participantId} | Espionage`,
    html: htmlBody,
    text: `Agent ${participant.name}, you have been shortlisted for Round 2 of Espionage! Login to your dashboard to access the Code Editor.`,
  });
}
