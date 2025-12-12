"use client";

import { useState } from "react";

export default function DevPanel() {
  const [result, setResult] = useState("");

  async function call(name: string, body?: unknown) {
    const res = await fetch(`/api/dev/${name}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    setResult(text);
  }

  return (
    <div className="p-8 text-white space-y-6">
      <h1 className="text-3xl font-bold">SkateHubba Dev Tools</h1>

      <div className="space-y-3">
        <button
          className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded"
          onClick={() => call("createFakeLobby")}
        >
          Create Fake Lobby
        </button>

        <button
          className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded"
          onClick={() => call("forceMatch")}
        >
          Force Match (Pair two tickets)
        </button>

        <button
          className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded"
          onClick={() => call("checkPresence")}
        >
          Check KV Presence
        </button>

        <button
          className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded"
          onClick={() => call("cleanupTickets")}
        >
          Cleanup Match Tickets
        </button>

        <button
          className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded"
          onClick={() => call("resetUser", { uid: "test" })}
        >
          Reset Test User
        </button>
      </div>

      <pre className="bg-black/30 p-4 rounded text-sm whitespace-pre-wrap">
        {result}
      </pre>
    </div>
  );
}
