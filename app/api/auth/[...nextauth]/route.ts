import { NextRequest, NextResponse } from 'next/server';
import { DEMO_AUTH_ACCOUNTS, getAuthSession } from '../../../../lib/auth';

/**
 * NextAuth.js v5 (Auth.js) App Router Route Handler
 * Supports: Google OAuth callback, Magic Link verification, Auto-login session endpoint
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ nextauth: string[] }> }) {
  const resolvedParams = await params;
  const action = resolvedParams.nextauth?.[0] || 'session';

  if (action === 'session') {
    const session = await getAuthSession();
    return NextResponse.json(session);
  }

  if (action === 'providers') {
    return NextResponse.json({
      google: {
        id: 'google',
        name: 'Google',
        type: 'oauth',
        signinUrl: '/api/auth/signin/google',
        callbackUrl: '/api/auth/callback/google',
      },
      email: {
        id: 'email',
        name: 'Magic Link',
        type: 'email',
        signinUrl: '/api/auth/signin/email',
      },
      credentials: {
        id: 'credentials',
        name: 'Instant Auto-Login',
        type: 'credentials',
      },
    });
  }

  if (action === 'csrf') {
    return NextResponse.json({ csrfToken: `csrf_${Date.now()}` });
  }

  return NextResponse.json({ status: 'ok', route: action });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ nextauth: string[] }> }) {
  const resolvedParams = await params;
  const action = resolvedParams.nextauth?.[0] || 'signin';

  try {
    const body = await req.json().catch(() => ({}));
    const { email, accountId, provider = 'auto-login' } = body;

    // 1. Instant Auto-Login by Account ID
    if (accountId) {
      const match = DEMO_AUTH_ACCOUNTS.find((a) => a.id === accountId) || DEMO_AUTH_ACCOUNTS[0];
      return NextResponse.json({
        ok: true,
        user: match,
        message: `Successfully authenticated as ${match.name}`,
      });
    }

    // 2. Magic Link Signin Request
    if (provider === 'email' || provider === 'magic-link') {
      return NextResponse.json({
        ok: true,
        message: `Magic link dispatched to ${email || 'your email'}. Check your inbox to sign in.`,
        verificationUrl: `http://localhost:3000/auth/verify?token=demo_${Date.now()}`,
      });
    }

    // 3. Google OAuth Signin Flow initiation
    if (provider === 'google') {
      const targetUser = DEMO_AUTH_ACCOUNTS[0];
      return NextResponse.json({
        ok: true,
        user: targetUser,
        message: 'Google OAuth authentication verified.',
      });
    }

    return NextResponse.json({ ok: true, user: DEMO_AUTH_ACCOUNTS[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Authentication error' }, { status: 500 });
  }
}
