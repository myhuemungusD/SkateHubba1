import { kv } from "@vercel/kv";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) return new Response("Missing uid", { status: 400 });

    // Add user to queue
    await kv.zadd("queue", { score: Date.now(), member: uid });

    // Get two oldest players from queue
    const players = (await kv.zrange("queue", 0, 1)) as string[];

    if (!players || players.length < 2) {
      return Response.json({ status: "waiting" });
    }

    // In this implementation, players are just UIDs (strings), not JSON objects
    // based on the zadd above: member: uid
    const p1 = players[0] as string;
    const p2 = players[1] as string;

    const matchId = uuid();

    await kv.hmset(`match:${matchId}`, {
      players: JSON.stringify([p1, p2]),
      createdAt: Date.now(),
    });

    // Remove them from queue
    await kv.zrem("queue", p1);
    await kv.zrem("queue", p2);

    return Response.json({
      status: "matched",
      matchId,
      players: [p1, p2],
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
