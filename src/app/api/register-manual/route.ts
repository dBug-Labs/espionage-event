import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import OTP from '@/models/OTP';
import { sendRegistrationConfirmationEmail } from '@/lib/mailer';
import { verifyCaptcha } from '@/lib/captcha';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getConfig } from '@/models/EventConfig';

// ─── Validation Helpers ─────────────────────────────────────────────

function validateEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function validatePhone(p: string): boolean {
  return /^[6-9]\d{9}$/.test(p.replace(/\s/g, ''));
}

function validateRegNo(r: string): boolean {
  // SRM registration number: RA + alphanumeric, typically 15 chars
  return /^RA\d{13}$/i.test(r);
}

function validateName(n: string): boolean {
  // 2-100 chars, letters, spaces, dots, hyphens only
  return /^[a-zA-Z\s.\-']{2,100}$/.test(n);
}

function sanitizeString(s: string): string {
  return s.replace(/[<>{}]/g, '').trim();
}

// ─── Main Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    console.log('[register-manual] Received request');
    const body = await req.json();
    const { participant, teamType, partner, captchaToken, verificationToken, honeypot, formLoadedAt } = body;

    // ── Layer 1: Honeypot check ──
    if (honeypot) {
      console.warn('[register-manual] Honeypot triggered — bot detected');
      // Return fake success to confuse bots
      return NextResponse.json({
        success: true,
        participantId: `ESP-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
        message: 'Registration successful!',
      });
    }

    // ── Layer 2: Form timing check (must take > 3 seconds) ──
    if (formLoadedAt) {
      const elapsed = Date.now() - Number(formLoadedAt);
      if (elapsed < 3000) {
        console.warn(`[register-manual] Form submitted too fast: ${elapsed}ms`);
        return NextResponse.json(
          { error: 'Form submitted too quickly. Please take your time filling out the form.' },
          { status: 400 }
        );
      }
    }

    // ── Layer 3: Rate limiting (3 per IP per hour) ──
    const clientIP = getClientIP(req);
    const ipLimit = checkRateLimit({
      prefix: 'register',
      identifier: clientIP,
      maxRequests: 3,
      windowSeconds: 3600,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${ipLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // ── Layer 4: reCAPTCHA verification ──
    const captchaResult = await verifyCaptcha(captchaToken);
    if (!captchaResult.success) {
      console.warn('[register-manual] Captcha failed:', captchaResult.error);
      return NextResponse.json(
        { error: captchaResult.error || 'Security verification failed. Please try again.' },
        { status: 403 }
      );
    }

    // ── Layer 5: Basic field presence ──
    if (!participant) {
      console.error('[register-manual] Missing data');
      return NextResponse.json({ error: 'Missing participant data.' }, { status: 400 });
    }

    const { name, email, collegeEmail, regNo, phone } = participant;
    if (!name || !email || !collegeEmail || !regNo || !phone) {
      console.error('[register-manual] Missing fields', participant);
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // ── Layer 6: Input validation & sanitization ──
    const cleanName = sanitizeString(name);
    const cleanEmail = sanitizeString(email).toLowerCase();
    const cleanCollegeEmail = sanitizeString(collegeEmail).toLowerCase();
    const cleanRegNo = sanitizeString(regNo).toUpperCase();
    const cleanPhone = sanitizeString(phone);

    if (!validateName(cleanName)) {
      return NextResponse.json({ error: 'Invalid name. Use only letters, spaces, and dots (2-100 chars).' }, { status: 400 });
    }
    if (!validateEmail(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (!validateEmail(cleanCollegeEmail)) {
      return NextResponse.json({ error: 'Invalid college email address.' }, { status: 400 });
    }
    // College email domain check
    if (!cleanCollegeEmail.endsWith('@srmist.edu.in')) {
      return NextResponse.json({ error: 'College email must be an @srmist.edu.in address.' }, { status: 400 });
    }
    if (!validateRegNo(cleanRegNo)) {
      return NextResponse.json({ error: 'Invalid registration number. Must be in format RA2XXXXXXXXXXX.' }, { status: 400 });
    }
    if (!validatePhone(cleanPhone)) {
      return NextResponse.json({ error: 'Invalid phone number. Must be a valid 10-digit Indian mobile number.' }, { status: 400 });
    }

    // ── Layer 7: OTP verification token check ──
    if (!verificationToken) {
      return NextResponse.json({ error: 'Email verification is required. Please verify your email with OTP first.' }, { status: 400 });
    }

    await connectToDatabase();
    const config = await getConfig();

    if (!config.registrationOpen) {
      return NextResponse.json({ error: 'Registration is currently closed.' }, { status: 403 });
    }

    // Verify the OTP token
    const otpRecord = await OTP.findOne({
      email: cleanEmail,
      otp: verificationToken,
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Email verification expired or invalid. Please verify your email again.' },
        { status: 400 }
      );
    }

    // Validate teamType
    const resolvedTeamType = teamType === 'duo' ? 'duo' : 'solo';

    // Validate partner if duo
    if (resolvedTeamType === 'duo') {
      if (!partner || !partner.name || !partner.email || !partner.collegeEmail || !partner.regNo || !partner.phone) {
        return NextResponse.json({ error: 'All partner fields are required for duo registration.' }, { status: 400 });
      }

      // Validate partner fields
      const pName = sanitizeString(partner.name);
      const pEmail = sanitizeString(partner.email).toLowerCase();
      const pCollegeEmail = sanitizeString(partner.collegeEmail).toLowerCase();
      const pRegNo = sanitizeString(partner.regNo).toUpperCase();
      const pPhone = sanitizeString(partner.phone);

      if (!validateName(pName)) {
        return NextResponse.json({ error: 'Invalid partner name.' }, { status: 400 });
      }
      if (!validateEmail(pEmail)) {
        return NextResponse.json({ error: 'Invalid partner email.' }, { status: 400 });
      }
      if (!validateEmail(pCollegeEmail) || !pCollegeEmail.endsWith('@srmist.edu.in')) {
        return NextResponse.json({ error: 'Partner college email must be a valid @srmist.edu.in address.' }, { status: 400 });
      }
      if (!validateRegNo(pRegNo)) {
        return NextResponse.json({ error: 'Invalid partner registration number.' }, { status: 400 });
      }
      if (!validatePhone(pPhone)) {
        return NextResponse.json({ error: 'Invalid partner phone number.' }, { status: 400 });
      }
    }

    // Duplicate check on leader
    const existing = await Participant.findOne({
      $or: [
        { email: cleanEmail },
        { regNo: cleanRegNo },
      ],
    });

    if (existing) {
      const field = existing.email === cleanEmail ? 'Email' : 'Registration Number';
      return NextResponse.json({ error: `${field} has already been registered.` }, { status: 409 });
    }

    // Duplicate check on partner (if duo)
    if (resolvedTeamType === 'duo' && partner) {
      const pEmail = sanitizeString(partner.email).toLowerCase();
      const pRegNo = sanitizeString(partner.regNo).toUpperCase();

      const existingPartner = await Participant.findOne({
        $or: [
          { email: pEmail },
          { regNo: pRegNo },
          { 'partner.email': pEmail },
          { 'partner.regNo': pRegNo },
        ],
      });

      if (existingPartner) {
        return NextResponse.json({ error: 'Partner email or registration number has already been registered.' }, { status: 409 });
      }

      const partnerAsLeader = await Participant.findOne({
        $or: [
          { email: pEmail },
          { regNo: pRegNo },
        ],
      });
      if (partnerAsLeader) {
        return NextResponse.json({ error: 'Your partner is already registered as a team leader.' }, { status: 409 });
      }
    }

    let participantId = '';
    let isUnique = false;
    
    // Generate a random 3-digit number (100 to 999) and ensure it's unique
    while (!isUnique) {
      const randomBits = Math.floor(100 + Math.random() * 900);
      participantId = `ESP-${randomBits}`;
      const existingId = await Participant.findOne({ participantId });
      if (!existingId) {
        isUnique = true;
      }
    }

    const newParticipant = await Participant.create({
      participantId,
      name: cleanName,
      email: cleanEmail,
      collegeEmail: cleanCollegeEmail,
      regNo: cleanRegNo,
      phone: cleanPhone,
      teamType: resolvedTeamType,
      partner: resolvedTeamType === 'duo' && partner ? {
        name: sanitizeString(partner.name),
        email: sanitizeString(partner.email).toLowerCase(),
        collegeEmail: sanitizeString(partner.collegeEmail).toLowerCase(),
        regNo: sanitizeString(partner.regNo).toUpperCase(),
        phone: sanitizeString(partner.phone),
      } : undefined,
    });

    // Clean up used OTP
    await OTP.deleteMany({ email: cleanEmail });

    console.log('[register-manual] Success:', participantId);

    // Send confirmation emails
    const allEmails = [{ name: cleanName, email: cleanEmail }];
    if (resolvedTeamType === 'duo' && partner) {
      allEmails.push({
        name: sanitizeString(partner.name),
        email: sanitizeString(partner.email).toLowerCase(),
      });
    }

    for (const person of allEmails) {
      sendRegistrationConfirmationEmail({
        participantId: newParticipant.participantId,
        name: person.name,
        email: person.email,
        teamType: resolvedTeamType,
        leaderName: cleanName,
        partnerName: resolvedTeamType === 'duo' && partner ? sanitizeString(partner.name) : undefined,
      }).catch((err) => console.error('[mailer] Registration email error:', err));
    }

    return NextResponse.json({
      success: true,
      participantId: newParticipant.participantId,
      name: newParticipant.name,
      teamType: resolvedTeamType,
      message: 'Registration successful! Check your email for confirmation.',
    });
  } catch (err: unknown) {
    console.error('[register-manual] ERROR:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: 'Failed to submit registration.',
      details: message,
    }, { status: 500 });
  }
}
