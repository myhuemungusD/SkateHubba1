import { firebaseApp } from "./firebaseClient";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth(firebaseApp);

export const listenToAuth = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Auth0 Universal Login entrypoint
export const login = () => {
  if (typeof window === "undefined") return;

  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!domain || !clientId || !siteUrl || !audience) {
    console.error("Missing Auth0 environment variables");
    return;
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${siteUrl}/auth/callback`,
    scope: "openid profile email",
    audience,
    state: window.location.pathname || "/",
  });

  window.location.href = `https://${domain}/authorize?${params.toString()}`;
};

export const logout = () => {
  if (typeof window === "undefined") return;

  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!domain || !clientId || !siteUrl) {
    console.error("Missing Auth0 environment variables");
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    returnTo: siteUrl,
  });

  window.location.href = `https://${domain}/v2/logout?${params.toString()}`;
};

export { auth };
