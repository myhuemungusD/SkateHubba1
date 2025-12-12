export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Admin once
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

export async function POST(req: Request) {
  try {
    const { uid, mode, skill } = await req.json();

    if (!uid || !mode) {
      return NextResponse.json({ error: "Missing uid or mode" }, { status: 400 });
    }

    const ticketRef = db.collection("matchTickets").doc();

    await ticketRef.set({
      uid,
      mode,
      skill: skill ?? 100,
      createdAt: Date.now(),
    });

    return NextResponse.json({ ticketId: ticketRef.id, status: "searching" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
