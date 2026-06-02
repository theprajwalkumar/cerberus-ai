import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const servers = await prisma.mcpServer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(servers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const server = await prisma.mcpServer.create({
    data: {
      name: body.name,
      url: body.url,
      apiKey: body.apiKey,
      type: body.type || "openai",
      status: body.status || "disconnected",
      policyId: body.policyId || null,
    },
  });
  return NextResponse.json(server, { status: 201 });
}