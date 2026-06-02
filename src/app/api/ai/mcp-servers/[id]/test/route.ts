import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const server = await prisma.mcpServer.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    };
    if (server.apiKey) {
      if (server.type === "openai") headers["Authorization"] = `Bearer ${server.apiKey}`;
      else if (server.type === "anthropic") headers["x-api-key"] = server.apiKey;
      else if (server.type === "custom") headers["x-api-key"] = server.apiKey;
      else headers["Authorization"] = `Bearer ${server.apiKey}`;
    }

    const res = await fetch(server.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", params: {}, id: 1 }),
      signal: AbortSignal.timeout(15000),
    });

    const raw = await res.text();

    // Try JSON first, then SSE format
    let data: any;
    try { data = JSON.parse(raw); } catch {
      // Parse SSE: extract JSON from "data: {...}" lines
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (t.startsWith("data: ")) {
          try { data = JSON.parse(t.slice(6)); break; } catch {}
        }
      }
      if (!data) data = { raw: raw.substring(0, 500) };
    }

    const isConnected = res.ok && !data?.error;
    const toolsCount = data?.result?.tools?.length || 0;
    const errorMessage = data?.error?.message || (res.ok ? null : `HTTP ${res.status}`);

    await prisma.mcpServer.update({
      where: { id: params.id },
      data: { status: isConnected ? "connected" : "error" },
    });

    return NextResponse.json({
      status: isConnected ? "connected" : "error",
      latency: Date.now() - start,
      statusCode: res.status,
      toolsCount,
      error: errorMessage,
    });
  } catch (err: any) {
    await prisma.mcpServer.update({
      where: { id: params.id },
      data: { status: "error" },
    });
    return NextResponse.json({
      status: "error",
      latency: Date.now() - start,
      error: err.message,
    });
  }
}