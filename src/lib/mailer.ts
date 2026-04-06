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

// ─── 1. Registration Confirmation Email (sent to ALL participants) ───

interface RegistrationEmailData {
  participantId: string;
  name: string;
  email: string;
  teamType: 'solo' | 'duo';
  leaderName: string;
  partnerName?: string;
}

export async function sendRegistrationConfirmationEmail(data: RegistrationEmailData) {
  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || '#';

  const teamLabel = data.teamType === 'duo'
    ? `<strong style="color: #FF5540;">DUO</strong> (${data.leaderName}${data.partnerName ? ` & ${data.partnerName}` : ''})`
    : `<strong style="color: #FF5540;">SOLO</strong>`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Space Grotesk', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); box-shadow: 0 0 30px rgba(255, 85, 64, 0.05); overflow: hidden;">
    <div style="background: rgba(255, 85, 64, 0.05); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 85, 64, 0.2);">
      <h1 style="margin: 0; font-size: 36px; color: #FF5540; letter-spacing: 0.2em; font-weight: 900;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #FFB4A8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">REGISTRATION CONFIRMED</p>
    </div>
    <div style="padding: 40px 30px;">
      <p style="color: #ABAAA9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Agent <strong style="color: #E5E2E1;">${data.name}</strong>,</p>
      <p style="color: #ABAAA9; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">Thank you for registering for <strong style="color: #FF5540;">ESPIONAGE</strong>! Your data has been recorded successfully. You are now in our database of potential operatives.</p>

      <div style="background: rgba(255, 85, 64, 0.05); border-top: 1px solid rgba(255, 85, 64, 0.2); border-bottom: 1px solid rgba(255, 85, 64, 0.2); padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #FF5540; margin-bottom: 8px; opacity: 0.8;">Team ID</p>
        <div style="font-size: 36px; font-weight: 900; color: #FF5540; letter-spacing: 0.2em; text-shadow: 0 0 15px rgba(255, 85, 64, 0.4);">${data.participantId}</div>
        <p style="font-size: 12px; color: #ABAAA9; margin-top: 12px;">Entry Type: ${teamLabel}</p>
      </div>

      <div style="background: #1C1C1D; border-left: 3px solid #FF5540; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #FF5540; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase;">📅 EVENT DETAILS</p>
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #E5E2E1;"><strong>DATE:</strong> ${process.env.EVENT_DATE}</p>
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #E5E2E1;"><strong>TIME:</strong> ${process.env.EVENT_TIME}</p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #E5E2E1;"><strong>VENUE:</strong> ${process.env.EVENT_VENUE}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #FF5540; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase;">⏰ WHAT'S NEXT?</p>
        <p style="margin: 0; font-size: 13px; color: #ABAAA9; line-height: 1.6;">Before the event, you will receive an <strong style="color: #E5E2E1;">RSVP email</strong> to confirm your attendance. Stay tuned on your registered email and also join our WhatsApp group for updates!</p>
      </div>

      <div style="margin: 32px 0; text-align: center;">
        <a href="${whatsappLink}" style="display: inline-block; background: #25D366; color: white; text-align: center; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;">📱 JOIN MISSION COMMS (WHATSAPP)</a>
      </div>

      <p style="color: #ABAAA9; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">Keep your Team ID <strong style="color: #FF5540;">${data.participantId}</strong> safe. You'll need it throughout the event!</p>
    </div>
    <div style="background: #0E0E0E; padding: 24px; text-align: center; border-top: 1px solid rgba(255, 85, 64, 0.2);">
      <p style="color: #848383; font-size: 10px; margin: 0; letter-spacing: 0.2em; text-transform: uppercase;">CLASSIFIED DIRECTIVE // EYES ONLY</p>
    </div>
  </div>
</body>
</html>`;

  const textBody = `
Agent ${data.name},

Thank you for registering for ESPIONAGE!

Team ID: ${data.participantId}
Entry Type: ${data.teamType.toUpperCase()}

What's Next:
Before the event, you will receive an RSVP email to confirm your attendance.

Join WhatsApp Group: ${whatsappLink}

CLASSIFIED DIRECTIVE // EYES ONLY
  `;

  await transporter.sendMail({
    from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: `✅ Registration Confirmed — Team ${data.participantId} | Espionage`,
    text: textBody,
    html: htmlBody,
  });
}

// ─── 2. RSVP Email (sent to TEAM LEADER only) ───

interface RSVPEmailData {
  participantId: string;
  name: string;
  email: string;
  rsvpToken: string;
  teamType: 'solo' | 'duo';
  partnerName?: string;
}

export async function sendRSVPEmail(data: RSVPEmailData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://espionage-event.vercel.app';
  const rsvpLink = `${siteUrl.replace(/\/$/, '')}/rsvp?token=${data.rsvpToken}`;
  const eventDate = process.env.EVENT_DATE || 'TBA';
  const eventTime = process.env.EVENT_TIME || 'TBA';
  const eventVenue = process.env.EVENT_VENUE || 'TBA';

  const teamLabel = data.teamType === 'duo'
    ? `${data.name}${data.partnerName ? ` & ${data.partnerName}` : ''}`
    : data.name;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Space Grotesk', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); box-shadow: 0 0 30px rgba(255, 85, 64, 0.05); overflow: hidden;">
    <div style="background: rgba(255, 85, 64, 0.05); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 85, 64, 0.2);">
      <h1 style="margin: 0; font-size: 36px; color: #FF5540; letter-spacing: 0.2em; font-weight: 900;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #FFB4A8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">🎯 RSVP REQUIRED</p>
    </div>
    <div style="padding: 40px 30px;">
      <p style="color: #ABAAA9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Agent <strong style="color: #E5E2E1;">${data.name}</strong>,</p>
      <p style="color: #ABAAA9; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">Your team has cleared the registration stage. Please review the RSVP page and confirm your attendance to lock your slot for the event. Seats are limited and confirmations are accepted on a first-confirmed basis.</p>

      <div style="background: rgba(255, 85, 64, 0.05); border: 1px solid rgba(255, 85, 64, 0.2); padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #FF5540; margin-bottom: 8px;">Team: ${data.participantId}</p>
        <p style="font-size: 14px; color: #E5E2E1; font-weight: bold;">${teamLabel}</p>
      </div>

      <div style="background: #1C1C1D; border-left: 3px solid #FF5540; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #E5E2E1;"><strong>📅 DATE:</strong> ${eventDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #E5E2E1;"><strong>🕐 TIME:</strong> ${eventTime}</p>
        <p style="margin: 0; font-size: 13px; color: #E5E2E1;"><strong>📍 VENUE:</strong> ${eventVenue}</p>
      </div>

      <div style="margin: 40px 0; text-align: center;">
        <a href="${rsvpLink}" style="display: inline-block; background: #FF5540; color: #FFFFFF; text-align: center; padding: 18px 40px; text-decoration: none; font-weight: 900; font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; box-shadow: 0 0 20px rgba(255, 85, 64, 0.3);">CONFIRM RSVP</a>
      </div>

      <p style="color: #848383; font-size: 11px; text-align: center; line-height: 1.6;">⚠️ Limited to <strong style="color: #FF5540;">50 teams / 100 members</strong>. Once the cap is hit, RSVP will close. Confirm ASAP!</p>

      <p style="color: #ABAAA9; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">This RSVP link is unique to your team. Do not share it with others.</p>
    </div>
    <div style="background: #0E0E0E; padding: 24px; text-align: center; border-top: 1px solid rgba(255, 85, 64, 0.2);">
      <p style="color: #848383; font-size: 10px; margin: 0; letter-spacing: 0.2em; text-transform: uppercase;">CLASSIFIED DIRECTIVE // EYES ONLY</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: `🎯 RSVP Required — Confirm Your Attendance | Espionage`,
    html: htmlBody,
    text: `Agent ${data.name}, review and confirm your RSVP here: ${rsvpLink}. Event date: ${eventDate}, time: ${eventTime}, venue: ${eventVenue}. Limited to 50 teams / 100 members.`,
  });
}

// ─── 3. Attendance QR Email (sent to RSVP-confirmed team leaders only) ───

interface AttendanceQREmailData {
  participantId: string;
  name: string;
  email: string;
}

export async function sendAttendanceQREmail(data: AttendanceQREmailData) {
  const qrDataUrl = await QRCode.toDataURL(data.participantId, { width: 200, margin: 2 });
  const loginLink = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/login`
    : 'https://espionage-event.vercel.app/login';
  const eventDate = process.env.EVENT_DATE || 'TBA';
  const eventTime = process.env.EVENT_TIME || 'TBA';
  const eventVenue = process.env.EVENT_VENUE || 'TBA';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Space Grotesk', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); box-shadow: 0 0 30px rgba(255, 85, 64, 0.05); overflow: hidden;">
    <div style="background: rgba(255, 85, 64, 0.05); padding: 40px 30px; text-align: center; border-bottom: 1px solid rgba(255, 85, 64, 0.2);">
      <h1 style="margin: 0; font-size: 36px; color: #FF5540; letter-spacing: 0.2em; font-weight: 900;">ESPIONAGE</h1>
      <p style="margin: 8px 0 0; color: #FFB4A8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">🎟️ YOUR ENTRY PASS</p>
    </div>
    <div style="padding: 40px 30px;">
      <p style="color: #ABAAA9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Agent <strong style="color: #E5E2E1;">${data.name}</strong>,</p>
      <p style="color: #ABAAA9; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">You've been <strong style="color: #FF5540;">shortlisted</strong> for the mission! Below is your attendance QR code — show this at the entry checkpoint.</p>

      <div style="background: rgba(255, 85, 64, 0.05); border-top: 1px solid rgba(255, 85, 64, 0.2); border-bottom: 1px solid rgba(255, 85, 64, 0.2); padding: 32px 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #FF5540; margin-bottom: 12px; opacity: 0.8;">Agent ID</p>
        <div style="font-size: 42px; font-weight: 900; color: #FF5540; letter-spacing: 0.2em; text-shadow: 0 0 15px rgba(255, 85, 64, 0.4);">${data.participantId}</div>
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
        <a href="${loginLink}" style="display: inline-block; background: #FF5540; color: #FFFFFF; text-align: center; padding: 16px 32px; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; box-shadow: 0 0 20px rgba(255, 85, 64, 0.3);">LOGIN TO DASHBOARD</a>
      </div>

      <p style="color: #ABAAA9; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 24px;">Use your registered email to access the intelligence dashboard on event day.</p>
    </div>
    <div style="background: #0E0E0E; padding: 24px; text-align: center; border-top: 1px solid rgba(255, 85, 64, 0.2);">
      <p style="color: #848383; font-size: 10px; margin: 0; letter-spacing: 0.2em; text-transform: uppercase;">CLASSIFIED DIRECTIVE // EYES ONLY</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Espionage | DBUG" <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: `🎟️ Your Entry Pass — Agent ${data.participantId} | Espionage`,
    html: htmlBody,
    text: `Agent ${data.name}, you've been shortlisted! Your Agent ID is ${data.participantId}. Date: ${eventDate}, Time: ${eventTime}, Venue: ${eventVenue}. Login: ${loginLink}`,
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

// ─── 4. Shortlist / Round 2 Email (sent to ALL participants of shortlisted teams) ───

export async function sendShortlistEmail(participant: { name: string; email: string; participantId: string }) {
  const loginLink = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/login`
    : 'https://espionage-event.vercel.app/login';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', 'Space Grotesk', 'Courier New', monospace; background: #0E0E0E; color: #E5E2E1; margin: 0; padding: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: #131313; border: 1px solid rgba(255, 85, 64, 0.2); box-shadow: 0 0 30px rgba(255, 85, 64, 0.05); overflow: hidden;">
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
