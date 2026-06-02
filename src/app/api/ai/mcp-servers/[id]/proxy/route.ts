import { NextRequest, NextResponse } from "next/server";
import { prisma, sanitize } from "@/lib/db";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const server = await prisma.mcpServer.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

  const body = await request.json();
  const prompt = body.prompt || body.messages?.[body.messages.length - 1]?.content || JSON.stringify(body);
  const start = Date.now();

  // Check policies before proxying
  if (server.policyId) {
    const policy = await prisma.aiPolicy.findUnique({ where: { id: server.policyId } });
    if (policy?.enabled) {
      const rules = JSON.parse(policy.rules || "[]");
      for (const rule of rules) {
        if (rule.type === "block_keywords" && rule.keywords?.some((k: string) => prompt.toLowerCase().includes(k.toLowerCase()))) {
          await prisma.mcpLog.create({
            data: {
              serverId: params.id,
              request: sanitize(prompt) || "",
              response: null,
              status: "blocked",
              policyEval: sanitize(JSON.stringify({ blockedBy: rule.name, reason: `Matched keyword from rule: ${rule.name}` })) || "",
              duration: Date.now() - start,
            },
          });
          return NextResponse.json({ error: "Request blocked by policy", rule: rule.name }, { status: 403 });
        }
        if (rule.type === "max_tokens" && rule.maxTokens && prompt.split(" ").length > rule.maxTokens) {
          await prisma.mcpLog.create({
            data: {
              serverId: params.id,
              request: sanitize(prompt) || "",
              response: null,
              status: "blocked",
              policyEval: sanitize(JSON.stringify({ blockedBy: rule.name, reason: "Exceeded max token limit" })) || "",
              duration: Date.now() - start,
            },
          });
          return NextResponse.json({ error: "Request exceeds max token limit", rule: rule.name }, { status: 403 });
        }
      }
    }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml,application/json,text/event-stream;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };
    if (server.apiKey) {
      if (server.type === "openai") headers["Authorization"] = `Bearer ${server.apiKey}`;
      else headers["x-api-key"] = server.apiKey;
    }

    const response = await fetch(server.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    const data = await response.text();
    const duration = Date.now() - start;
    let parsed: any;
    try { parsed = JSON.parse(data); } catch { parsed = data; }

    await prisma.mcpLog.create({
      data: {
        serverId: params.id,
        request: sanitize(prompt) || "",
        response: sanitize(typeof parsed === "string" ? parsed : JSON.stringify(parsed)) || "",
        status: response.ok ? "success" : "error",
        duration,
        tokensIn: body.messages?.length || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json(parsed, { status: response.status });
  } catch (err: any) {
    const duration = Date.now() - start;
    await prisma.mcpLog.create({
      data: {
        serverId: params.id,
        request: sanitize(prompt) || "",
        response: sanitize(err.message) || "",
        status: "error",
        duration,
      },
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}