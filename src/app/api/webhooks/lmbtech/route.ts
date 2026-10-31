import { NextResponse } from "next/server";
import { normalizeLmbtechStatus } from "@/lib/lmbtech";
import { reconcileLmbtechPayment, reconcileLmbtechPayout } from "@/lib/lmbtech-reconciliation";

function getTextField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() || "";
    let body: Record<string, unknown>;
    if (contentType.includes("application/json")) {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }

    const referenceId = getTextField(body.reference_id);
    const transactionId = getTextField(body.transaction_id);
    const action = getTextField(body.action).toLowerCase();
    if (!referenceId || !transactionId || !normalizeLmbtechStatus(body.status) ||
        (action !== "pay" && action !== "payout")) {
      return NextResponse.json({ error: "Required callback fields are missing or invalid." }, { status: 400 });
    }

    if (action === "pay") {
      await reconcileLmbtechPayment(referenceId, transactionId);
    } else {
      await reconcileLmbtechPayout(referenceId, transactionId);
    }

    return NextResponse.json({
      status: true,
      message: "Callback received and processed",
      site_url: process.env.NEXT_PUBLIC_APP_URL || "https://www.logictradersltd.com",
    });
  } catch (error) {
    console.error("LMBTech callback processing failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to process LMBTech callback." }, { status: 500 });
  }
}
