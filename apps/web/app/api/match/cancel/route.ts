export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Init Admin once
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

export async function POST(req: Request) {
  try {
    const { uid, ticketId } = await req.json();

    if (!uid || !ticketId) {
      return NextResponse.json(
        { error: "Missing uid or ticketId" },
        { status: 400 }
      );
    }

    await db.collection("matchTickets").doc(ticketId).delete().catch(() => {});

    return NextResponse.json({ status: "cancelled" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
