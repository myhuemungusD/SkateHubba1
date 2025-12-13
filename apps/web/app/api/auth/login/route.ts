import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || "/";

  const domain = process.env.AUTH0_DOMAIN ?? process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID ?? process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const audience = process.env.AUTH0_AUDIENCE ?? process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;

  if (!domain || !clientId || !audience) {
    return new NextResponse(
      "Auth is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE (or NEXT_PUBLIC_AUTH0_* equivalents) in Vercel env.",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }

  const origin = url.origin;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${origin}/auth/callback`,
    scope: "openid profile email",
    audience,
    state: returnTo,
  });

  return NextResponse.redirect(`https://${domain}/authorize?${params.toString()}`);
}
