import { NextResponse } from 'next/server';

function envFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isLoginPaused(): boolean {
  return envFlag(process.env.LOGIN_PAUSED) || envFlag(process.env.NEXT_PUBLIC_LOGIN_PAUSED);
}

export function isOtpPaused(): boolean {
  return envFlag(process.env.OTP_ROUTES_PAUSED) || envFlag(process.env.NEXT_PUBLIC_OTP_ROUTES_PAUSED);
}

export function pausedResponse(message: string, status = 503) {
  return NextResponse.json({ error: message, paused: true }, { status });
}
