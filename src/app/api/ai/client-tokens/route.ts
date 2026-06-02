import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const API_KEY_PATTERN = /^(sk-proj-|sk-|sk-ant-|sess-|fk)[a-zA-Z0-9_-]+$/;

function isRealApiKey(token: string): boolean {
  return API_KEY_PATTERN.test(token);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokenVal = body.token || "";

    // Reject JWT tokens (start with eyJ) and anything that doesn't look like an API key
    if (!isRealApiKey(tokenVal)) {
      return NextResponse.json({ ok: false, error: "not a valid API key format" }, { status: 400, headers: corsHeaders });
    }

    const token = await prisma.clientToken.create({
      data: {
        source: body.source || "unknown",
        type: body.type || "api_key",
        token: tokenVal,
        label: body.label || null,
        url: body.url || null,
        logId: body.logId || null,
      },
    });
    return NextResponse.json({ ok: true, id: token.id }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Client token error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    if (action === "cleanup-jwt") {
      const result = await prisma.clientToken.deleteMany({
        where: { token: { startsWith: "eyJ" } },
      });
      return NextResponse.json({ ok: true, deleted: result.count }, { headers: corsHeaders });
    }
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
    const offset = Number(searchParams.get("offset")) || 0;
    const source = searchParams.get("source");
    const type = searchParams.get("type");

    const where: any = {};
    if (source) where.source = source;
    if (type) where.type = type;

    const [tokens, total] = await Promise.all([
      prisma.clientToken.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { log: { select: { url: true, method: true, createdAt: true } } },
      }),
      prisma.clientToken.count({ where }),
    ]);

    return NextResponse.json({ tokens, total, limit, offset, hasMore: offset + tokens.length < total }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Client tokens GET error:", error);
    return NextResponse.json({ tokens: [], total: 0, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id parameter required" }, { status: 400, headers: corsHeaders });
    }
    await prisma.clientToken.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Client token DELETE error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
