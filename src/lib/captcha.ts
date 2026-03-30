/**
 * Server-side Cloudflare Turnstile verification.
 */

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';

interface CaptchaVerifyResult {
  success: boolean;
  score?: number;
  error?: string;
}

export async function verifyCaptcha(token: string): Promise<CaptchaVerifyResult> {
  if (!TURNSTILE_SECRET_KEY) {
    console.warn('[captcha] TURNSTILE_SECRET_KEY not set, skipping verification');
    return { success: true, score: 1.0 };
  }

  if (!token) {
    return { success: false, score: 0, error: 'No security token provided.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        score: 0,
        error: `Turnstile verification failed: ${(data['error-codes'] || []).join(', ')}`,
      };
    }

    // Turnstile operates mostly as a pass/fail. We map it to a successful score.
    return { success: true, score: 1.0 };
  } catch (err) {
    console.error('[captcha] Verification error:', err);
    return { success: false, score: 0, error: 'Security verification service unavailable.' };
  }
}
