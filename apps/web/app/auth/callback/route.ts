import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";

  if (!code) {
    return NextResponse.json({ error: "Missing Auth0 params" }, { status: 400 });
  }

  const domain = process.env.AUTH0_DOMAIN ?? process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID ?? process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (!domain || !clientId || !clientSecret || !siteUrl) {
    return NextResponse.json({ error: "Missing Auth0 environment variables" }, { status: 500 });
  }

  // Exchange code for Auth0 access token
  const tokenRes = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${siteUrl}/auth/callback`,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json({ error: "Failed to exchange token", detail: text }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  const auth0Token = tokenData.access_token as string | undefined;

  if (!auth0Token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 500 });
  }

  const redirectTarget = new URL(`/auth/finish`, siteUrl);
  redirectTarget.searchParams.set("token", auth0Token);
  if (state) redirectTarget.searchParams.set("state", state);

  return NextResponse.redirect(redirectTarget);
}
