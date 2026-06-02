import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.test) {
      return NextResponse.json({ ok: true }, { headers: corsHeaders });
    }

    const log = await prisma.bridgeLog.create({
      data: {
        sessionId: body.sessionId || null,
        conversationId: body.conversationId || null,
        method: body.method || "POST",
        url: body.url || null,
        request: typeof body.request === "string" ? body.request : (body.request ? JSON.stringify(body.request) : ""),
        response: body.response || null,
        status: body.status || 200,
        durationMs: body.durationMs ? Math.round(body.durationMs) : null,
        contentType: body.contentType || null,
        userAgent: body.userAgent || null,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      },
    });

    return NextResponse.json({ ok: true, id: log.id }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Bridge log error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

const BRIDGE_NOISE_PATTERNS = [
  "/accounts/check",
  "/sentinel/chat-requirements",
  "/moderations",
];

function isBridgeNoise(log: any): boolean {
  const url = (log.url || "").toLowerCase();
  const method = (log.method || "").toUpperCase();

  for (const pattern of BRIDGE_NOISE_PATTERNS) {
    if (url.includes(pattern)) return true;
  }

  if (method === "GET" && url.includes("/models") && !url.includes("/models/")) return true;

  if (method === "GET" && url.match(/\/conversations(?:\?|$)/)) return true;

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 1000);
    const offset = Number(searchParams.get("offset")) || 0;
    const sessionId = searchParams.get("sessionId");
    const conversationId = searchParams.get("conversationId");
    const source = searchParams.get("source");
    const method = searchParams.get("method");
    const status = searchParams.get("status");
    const excludeNoise = searchParams.get("excludeNoise") !== "false";

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (conversationId) where.conversationId = conversationId;
    if (method) where.method = method;
    if (status) where.status = parseInt(status);
    if (source === "chatgpt") {
      where.url = { contains: "chatgpt.com" };
    } else if (source === "claude") {
      where.url = { contains: "claude.ai" };
    }

    const [allLogs, total] = await Promise.all([
      prisma.bridgeLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { tokens: true },
      }),
      prisma.bridgeLog.count({ where }),
    ]);

    const logs = excludeNoise ? allLogs.filter((log) => !isBridgeNoise(log)) : allLogs;

    return NextResponse.json({ logs, total, limit, offset, hasMore: offset + logs.length < total }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Bridge logs GET error:", error);
    return NextResponse.json({ logs: [], total: 0, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");

    if (id) {
      await prisma.bridgeLog.delete({ where: { id } });
      return NextResponse.json({ ok: true, deleted: 1 }, { headers: corsHeaders });
    }

    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      const result = await prisma.bridgeLog.deleteMany({ where: { id: { in: idList } } });
      return NextResponse.json({ ok: true, deleted: result.count }, { headers: corsHeaders });
    }

    if (action === "cleanup-old") {
      const olderThan = searchParams.get("olderThan") || "7";
      const days = parseFloat(olderThan) || 7;
      const cutoff = new Date(Date.now() - days * 86400000);
      const result = await prisma.bridgeLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      return NextResponse.json({ ok: true, deleted: result.count }, { headers: corsHeaders });
    }

    return NextResponse.json({ ok: false, error: "id, ids, or action required" }, { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error("Bridge log DELETE error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
