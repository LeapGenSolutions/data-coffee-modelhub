import { User, BillingPlanTier } from '../types';

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    plan: BillingPlanTier | string;
    creditsRemaining: number;
    tokensUsed: number;
  };
  expires: string;
}

export const DEMO_AUTH_ACCOUNTS: Array<{
  id: string;
  name: string;
  email: string;
  plan: BillingPlanTier;
  avatar: string;
  creditsRemaining: number;
  tokensUsed: number;
  roleDescription: string;
}> = [
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@enterprise.ai',
    plan: 'Pro',
    avatar: 'AR',
    creditsRemaining: 142.5,
    tokensUsed: 428000,
    roleDescription: 'Senior AI Engineer · Active Pro Plan',
  },
  {
    id: 'user_sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@techcorp.io',
    plan: 'Team',
    avatar: 'SC',
    creditsRemaining: 580.0,
    tokensUsed: 1250000,
    roleDescription: 'Team Lead & Admin · Unlimited Team Tier',
  },
  {
    id: 'user_demo',
    name: 'Demo Explorer',
    email: 'guest@datacoffee.dev',
    plan: 'Free',
    avatar: 'DE',
    creditsRemaining: 25.0,
    tokensUsed: 15400,
    roleDescription: 'Trial Account · Free Starter Tier',
  },
];

/**
 * NextAuth / Auth.js Configuration & Provider Resolver
 */
export const authConfig = {
  providers: [
    {
      id: 'google',
      name: 'Google',
      type: 'oauth' as const,
      authorization: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    },
    {
      id: 'email',
      name: 'Magic Link',
      type: 'email' as const,
      maxAge: 24 * 60 * 60, // 24 hours
    },
    {
      id: 'credentials',
      name: 'Instant Auto-Login',
      type: 'credentials' as const,
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
    },
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token?.sub || 'user_alex';
        session.user.plan = token?.plan || 'Pro';
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.plan = user.plan || 'Pro';
      }
      return token;
    },
  },
};

/**
 * Server-side Auth Session Getter helper
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  // Default auto-login user for seamless development/testing
  return {
    user: {
      id: DEMO_AUTH_ACCOUNTS[0].id,
      name: DEMO_AUTH_ACCOUNTS[0].name,
      email: DEMO_AUTH_ACCOUNTS[0].email,
      image: undefined,
      plan: DEMO_AUTH_ACCOUNTS[0].plan,
      creditsRemaining: DEMO_AUTH_ACCOUNTS[0].creditsRemaining,
      tokensUsed: DEMO_AUTH_ACCOUNTS[0].tokensUsed,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
