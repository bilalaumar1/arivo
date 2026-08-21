import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";

type OrderStatus =
  | "payment_pending"
  | "payment_confirmed"
  | "processing"
  | "fulfilled"
  | "failed";

type OrderPayload = {
  id: string;
  service: "electricity" | "internet" | "mobile" | "giftcards";
  serviceName: string;
  email: string;
  country?: string;
  localCurrency?: string;
  localAmount?: number;
  localAmountFormatted: string;
  paymentAsset: "USDC" | "EURC";
  cryptoAmount: number;
  transactionHash: string;
  paymentReceiver: string;
  network: "Arc Testnet";
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  fulfillmentNote: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCrypto(amount: number, asset: string) {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${asset}`;
}

function getArivoLogoBase64() {
  const logoPath = path.join(process.cwd(), "public", "arivo-icon-black.png");

  try {
    return fs.readFileSync(logoPath).toString("base64");
  } catch (error) {
    console.error("Arivo logo could not be loaded:", error);
    return null;
  }
}

function fulfillmentText(order: OrderPayload) {
  switch (order.service) {
    case "giftcards":
      return "Payment confirmed. Your gift card is waiting for provider fulfillment.";
    case "electricity":
      return "Payment confirmed. Your electricity service is waiting for provider confirmation.";
    case "internet":
      return "Payment confirmed. Your internet service is waiting for provider confirmation.";
    case "mobile":
      return "Payment confirmed. Your mobile recharge is waiting for provider confirmation.";
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ARIVO_EMAIL_FROM;

    if (!apiKey || !from) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Add RESEND_API_KEY and ARIVO_EMAIL_FROM to .env.local.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const order = body?.order as OrderPayload | undefined;

    if (!order) {
      return NextResponse.json(
        { error: "Missing order data." },
        { status: 400 }
      );
    }

    if (!emailPattern.test(order.email)) {
      return NextResponse.json(
        { error: "The customer email address is invalid." },
        { status: 400 }
      );
    }

    if (
      !order.transactionHash ||
      !order.paymentAsset ||
      !order.cryptoAmount ||
      !order.serviceName
    ) {
      return NextResponse.json(
        { error: "Incomplete payment data." },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    const serviceAmount = escapeHtml(order.localAmountFormatted);
    const paidAmount = escapeHtml(
      formatCrypto(order.cryptoAmount, order.paymentAsset)
    );
    const transactionHash = escapeHtml(order.transactionHash);
    const orderId = escapeHtml(order.id);
    const serviceName = escapeHtml(order.serviceName);
    const email = escapeHtml(order.email);
    const createdAt = escapeHtml(
      new Date(order.createdAt).toLocaleString()
    );
    const providerMessage = escapeHtml(fulfillmentText(order));

    const explorerUrl = `https://testnet.arcscan.app/tx/${encodeURIComponent(
      order.transactionHash
    )}`;

    const logoBase64 = getArivoLogoBase64();

    const { data, error } = await resend.emails.send({
      from,
      to: order.email,
      subject: `Arivo payment confirmed · ${order.serviceName} · ${order.id}`,
      html: `
        <!doctype html>
        <html>
          <body style="margin:0;background:#f4f6f8;color:#0b1020;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
              <div style="background:#07101f;border-radius:18px 18px 0 0;padding:24px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td valign="middle" style="padding:0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td valign="middle" style="padding:0;">
                            <div style="width:52px;height:52px;border-radius:15px;background:#efe5d2;overflow:hidden;text-align:center;">
                              ${
                                logoBase64
                                  ? `<img src="cid:arivo-logo" width="52" height="52" alt="Arivo" style="display:block;width:52px;height:52px;object-fit:contain;border:0;" />`
                                  : `<span style="display:block;color:#07101f;font-weight:800;font-size:25px;line-height:52px;">A</span>`
                              }
                            </div>
                          </td>

                          <td valign="middle" style="padding:7px 0 0 13px;">
                            <div style="color:#fff;font-size:25px;font-weight:750;line-height:30px;">
                              Arivo
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>

                    <td valign="middle" align="right" style="padding:0;">
                      <div style="display:inline-block;min-width:76px;height:40px;border-radius:999px;background:#22c55e;color:#052812;font-size:11px;font-weight:800;letter-spacing:1.1px;line-height:40px;text-align:center;">
                        PAID
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background:#fff;padding:34px 28px;border:1px solid #e3e7ed;border-top:0;border-radius:0 0 18px 18px;">
                <div style="font-size:11px;color:#8791a1;letter-spacing:2px;font-weight:700;">
                  PAYMENT CONFIRMED
                </div>

                <h1 style="font-size:30px;line-height:1.15;margin:10px 0 6px;">
                  ${serviceName}
                </h1>

                <p style="margin:0;color:#667085;font-size:14px;">
                  Your Arivo payment has been confirmed on Arc Testnet.
                </p>

                <div style="margin-top:24px;background:#f7f8fb;border:1px solid #dfe4ea;border-radius:16px;padding:22px 22px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;">
                    <tr>
                      <td valign="top" width="55%" style="padding:0 22px 0 0;">
                        <div style="font-size:11px;color:#8791a1;letter-spacing:1.5px;font-weight:800;white-space:nowrap;">
                          AMOUNT PAID
                        </div>
                        <div style="font-size:16px;line-height:1.2;font-weight:800;margin-top:8px;color:#0b1020;white-space:nowrap;">
                          ${paidAmount}
                        </div>
                      </td>

                      <td valign="top" width="45%" style="padding:0 0 0 10px;">
                        <div style="font-size:11px;color:#8791a1;letter-spacing:1.4px;font-weight:800;white-space:nowrap;">
                          SERVICE AMOUNT
                        </div>
                        <div style="font-size:16px;line-height:1.2;font-weight:750;margin-top:8px;color:#1f2937;white-space:nowrap;">
                          ${serviceAmount}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <div style="height:1px;background:#e4e8ee;margin:18px 0 14px;"></div>

                  <div style="font-size:12px;color:#667085;line-height:1.5;">
                    Payment confirmed on Arc Testnet.
                  </div>
                </div>

                <div style="margin-top:20px;border:1px solid #dfe4ea;border-radius:14px;overflow:hidden;">
                  <div style="padding:13px 16px;border-bottom:1px solid #e7ebf0;">
                    <span style="color:#667085;font-size:13px;">Order ID</span>
                    <strong style="float:right;font-size:13px;">${orderId}</strong>
                  </div>

                  <div style="padding:13px 16px;border-bottom:1px solid #e7ebf0;">
                    <span style="color:#667085;font-size:13px;">Network</span>
                    <strong style="float:right;font-size:13px;">Arc Testnet</strong>
                  </div>

                  <div style="padding:13px 16px;border-bottom:1px solid #e7ebf0;">
                    <span style="color:#667085;font-size:13px;">Payment asset</span>
                    <strong style="float:right;font-size:13px;">${escapeHtml(
                      order.paymentAsset
                    )}</strong>
                  </div>

                  <div style="padding:13px 16px;border-bottom:1px solid #e7ebf0;">
                    <span style="color:#667085;font-size:13px;">Payment date</span>
                    <strong style="float:right;font-size:13px;">${createdAt}</strong>
                  </div>

                  <div style="padding:13px 16px;">
                    <span style="color:#667085;font-size:13px;">Transaction</span>
                    <a href="${explorerUrl}" style="float:right;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1d4ed8;font-size:13px;">
                      ${transactionHash}
                    </a>
                  </div>
                </div>

                <div style="margin-top:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
                  <div style="font-size:13px;font-weight:700;">
                    Next step
                  </div>
                  <div style="margin-top:6px;color:#667085;font-size:13px;line-height:1.6;">
                    ${providerMessage}
                  </div>
                </div>

                <div style="margin-top:24px;text-align:center;">
                  <a
                    href="${explorerUrl}"
                    style="display:inline-block;background:#07101f;color:#fff;text-decoration:none;border-radius:10px;padding:12px 18px;font-size:13px;font-weight:700;"
                  >
                    View transaction
                  </a>
                </div>

                <p style="margin:28px 0 0;color:#98a2b3;font-size:11px;line-height:1.6;">
                  This email confirms the blockchain payment. Service fulfillment
                  is completed separately after the connected provider confirms delivery.
                </p>
              </div>

              <div style="padding:18px;text-align:center;color:#98a2b3;font-size:11px;">
                Arivo Pay · Built on Arc Testnet
              </div>
            </div>
          </body>
        </html>
      `,
      attachments: logoBase64
        ? [
            {
              content: logoBase64,
              filename: "arivo-icon.png",
              contentId: "arivo-logo",
              contentType: "image/png",
            },
          ]
        : undefined,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Email provider rejected the message." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      emailId: data?.id ?? null,
    });
  } catch (error) {
    console.error("Order email route failed:", error);

    return NextResponse.json(
      { error: "Unable to send the payment confirmation email." },
      { status: 500 }
    );
  }
}
