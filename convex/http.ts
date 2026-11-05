import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

function getSecret() {
  const value = process.env.LENDLOOP_N8N_SECRET;
  if (!value) throw new Error("LENDLOOP_N8N_SECRET is not configured in Convex.");
  return value;
}

async function verifySignature(timestamp: string | null, signature: string | null, body: string) {
  if (!timestamp || !signature || !/^\d{10}$/.test(timestamp)) return false;
  const seconds = Number(timestamp);
  if (Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const raw = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(raw), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

http.route({
  path: "/automation/overdue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!await verifySignature(request.headers.get("x-lendloop-timestamp"), request.headers.get("x-lendloop-signature"), "")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const loans = await ctx.runQuery(internal.automation.overdueLoans, { today });
    return Response.json(loans.filter((loan) => !loan.reminderSentToday).map((loan) => ({
      loanId: loan.loanId,
      toolName: loan.toolName,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      endDate: loan.endDate,
      idempotencyKey: loan.idempotencyKey,
    })));
  }),
});

http.route({
  path: "/automation/reminder",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (!await verifySignature(request.headers.get("x-lendloop-timestamp"), request.headers.get("x-lendloop-signature"), body)) {
      return new Response("Unauthorized", { status: 401 });
    }
    let payload: { loanId?: string; idempotencyKey?: string };
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error("Invalid reminder JSON payload", error);
      return new Response("Invalid JSON", { status: 400 });
    }
    if (typeof payload.loanId !== "string" || typeof payload.idempotencyKey !== "string") {
      return new Response("Invalid reminder payload", { status: 400 });
    }
    const loanId = await ctx.runQuery(internal.automation.normalizeLoanId, { loanId: payload.loanId });
    if (!loanId) return new Response("Invalid loan id", { status: 400 });
    const result = await ctx.runMutation(internal.automation.recordReminder, {
      loanId,
      idempotencyKey: payload.idempotencyKey,
    });
    return Response.json(result);
  }),
});

export default http;
