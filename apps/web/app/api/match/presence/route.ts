export const runtime = "edge";

import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  try {
    const { uid, mode, skill } = await req.json();

    if (!uid || !mode) {
      return new Response(JSON.stringify({ error: "Missing uid or mode" }), {
        status: 400,
      });
    }

    await kv.set(`presence:${uid}`, { uid, mode, skill: skill ?? 100 }, { ex: 30 });

    return new Response(JSON.stringify({ ok: true }));
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
