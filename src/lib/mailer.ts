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
  const loginLink = "https://espionage-event.vercel.app/login";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Space Grotesk', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); box-shadow: 0 0 30px rgba(255, 85, 64, 0.05); border-radius: 0; overflow: hidden; position: relative;">
    <div style="background: rgba(255, 85, 64, 0.05); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 85, 64, 0.2);">
      <h1 style="margin: 0; font-size: 36px; color: #FF5540; letter-spacing: 0.2em; font-weight: 900;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #FFB4A8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">MISSION CONFIRMED</p>
    </div>
    <div style="padding: 40px 30px;">
      <p style="color: #ABAAA9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Agent <strong style="color: #E5E2E1;">${participant.name}</strong>,</p>
      <p style="color: #ABAAA9; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">Your enrollment has been verified. You are now cleared for Operation Espionage. The intelligence terminal is awaiting your connection.</p>

      <div style="background: rgba(255, 85, 64, 0.05); border-top: 1px solid rgba(255, 85, 64, 0.2); border-bottom: 1px solid rgba(255, 85, 64, 0.2); padding: 32px 24px; text-align: center; margin-bottom: 32px;">
        <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #FF5540; margin-bottom: 12px; opacity: 0.8;">Assigned Agent ID</p>
        <div style="font-size: 42px; font-weight: 900; color: #FF5540; letter-spacing: 0.2em; text-shadow: 0 0 15px rgba(255, 85, 64, 0.4);">${participant.participantId}</div>
      </div>

      <div style="margin: 20px 0; border: 1px solid rgba(255, 255, 255, 0.1); background: #1C1C1D; padding: 20px;">
        <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #ABAAA9; margin-bottom: 8px;">Clearance Fee Verified</p>
        <p style="font-size: 24px; font-weight: bold; color: #E5E2E1; margin: 0;">₹${participant.amountPaid}</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; padding: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(132, 131, 131, 0.2);">
          <img src="cid:participant-qr-code" alt="QR Code" style="width: 180px; height: 180px; display: block;" />
        </div>
        <p style="color: #FF5540; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 16px;">Scan at Entry Checkpoint</p>
      </div>

      <div style="background: #1C1C1D; border-left: 3px solid #FF5540; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #ABAAA9;"><strong style="color: #E5E2E1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">DATE:</strong> ${eventDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #ABAAA9;"><strong style="color: #E5E2E1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">TIME:</strong> ${eventTime}</p>
        <p style="margin: 0; font-size: 13px; color: #ABAAA9;"><strong style="color: #E5E2E1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">VENUE:</strong> ${eventVenue}</p>
      </div>

      <div style="margin: 40px 0; text-align: center;">
        <a href="${loginLink}" style="display: inline-block; background: #FF5540; color: #FFFFFF; text-align: center; padding: 16px 32px; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; box-shadow: 0 0 20px rgba(255, 85, 64, 0.3);">LOGIN TO SECURE DASHBOARD</a>
      </div>

      <div style="margin: 24px 0; text-align: center;">
        <a href="${whatsappLink}" style="display: inline-block; background: #25D366; color: white; text-align: center; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">📱 JOIN MISSION COMMS (WHATSAPP)</a>
      </div>

      <p style="color: #ABAAA9; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">Keep your Agent ID <strong style="color: #FF5540;">${participant.participantId}</strong> guarded. Use your registered email to access the intelligence dashboard.</p>
    </div>
    <div style="background: #0E0E0E; padding: 24px; text-align: center; border-top: 1px solid rgba(255, 85, 64, 0.2);">
      <p style="color: #848383; font-size: 10px; margin: 0; letter-spacing: 0.2em; text-transform: uppercase;">CLASSIFIED DIRECTIVE // EYES ONLY</p>
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

Login to Dashboard: ${loginLink}
Join WhatsApp Group: ${whatsappLink}

Use your registered email to login to the dashboard.

CLASSIFIED DIRECTIVE // EYES ONLY
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
  const loginLink = "https://your-deployed-domain.com/login"; // Replace this link later

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Space Grotesk', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); box-shadow: 0 0 30px rgba(255, 85, 64, 0.05); border-radius: 0; overflow: hidden; position: relative;">
    <div style="background: rgba(255, 85, 64, 0.05); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 85, 64, 0.2);">
      <h1 style="margin: 0; font-size: 32px; color: #FF5540; letter-spacing: 0.2em; font-weight: 900;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #FFB4A8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">⚡ CLASSIFIED BRIEFING</p>
    </div>
    <div style="padding: 40px 30px; text-align: center;">
      <p style="color: #ABAAA9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Agent <strong style="color: #E5E2E1;">${participant.name}</strong>,</p>
      <p style="color: #E5E2E1; font-size: 20px; font-weight: 900; margin-bottom: 32px; letter-spacing: 0.05em; line-height: 1.4;">You have been shortlisted for <br/><span style="color: #FF5540;">ROUND 2</span>!</p>
      
      <div style="background: rgba(255, 85, 64, 0.05); border: 1px solid rgba(255, 85, 64, 0.2); padding: 24px; margin-bottom: 32px; text-align: left; border-left: 3px solid #FF5540;">
        <p style="color: #FF5540; font-size: 14px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 12px 0;">🎯 THE FINAL HACK</p>
        <p style="color: #ABAAA9; font-size: 13px; margin: 0; line-height: 1.6;">Login to your secure dashboard to access the Code Editor terminal and complete your final objective.</p>
      </div>

      <div style="margin: 40px 0;">
        <a href="${loginLink}" style="display: inline-block; background: #FF5540; color: #FFFFFF; text-align: center; padding: 16px 32px; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; box-shadow: 0 0 20px rgba(255, 85, 64, 0.3);">ACCESS TERMINAL</a>
      </div>

      <p style="color: #ABAAA9; font-size: 11px; letter-spacing: 0.05em; margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">Use your registered email to login at the event dashboard.</p>
    </div>
    <div style="background: #0E0E0E; padding: 20px; text-align: center; border-top: 1px solid rgba(255, 85, 64, 0.2);">
      <p style="color: #848383; font-size: 10px; margin: 0; letter-spacing: 0.2em; text-transform: uppercase;">CLASSIFIED DIRECTIVE // EYES ONLY</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
    to: participant.email,
    subject: `⚡ You're Shortlisted for Round 2 — Agent ${participant.participantId} | Espionage`,
    html: htmlBody,
    text: `Agent ${participant.name}, you have been shortlisted for Round 2 of Espionage! Login to your dashboard to access the Code Editor. Login: ${loginLink}`,
  });
}
