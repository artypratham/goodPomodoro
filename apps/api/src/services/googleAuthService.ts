import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

function getClient() {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED');
  }
  return new OAuth2Client(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
}

export function buildGoogleAuthUrl(params: { state: string; codeChallenge: string }) {
  const client = getClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    response_type: 'code',
    scope: ['openid', 'email', 'profile'],
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'consent'
  });
}

export async function exchangeCodeForProfile(params: {
  code: string;
  codeVerifier: string;
}) {
  const client = getClient();
  const { tokens } = await client.getToken({
    code: params.code,
    codeVerifier: params.codeVerifier,
    redirect_uri: env.googleRedirectUri
  });

  if (!tokens.id_token) {
    throw new Error('GOOGLE_ID_TOKEN_MISSING');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.googleClientId
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('GOOGLE_PROFILE_INVALID');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name,
    picture: payload.picture
  } as GoogleProfile;
}
