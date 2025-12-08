/**
 * Email Service
 *
 * Handles sending transactional emails using Resend.
 * Configured via RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "GreetNow <noreply@greetnow.com>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

/**
 * Send payment failure notification email to organization admin
 * @param adminEmail - Admin's email address
 * @param orgName - Organization name
 */
export async function sendPaymentFailedEmail(adminEmail: string, orgName: string): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured - payment failure email not sent");
    console.log("[Email] Would have sent payment failure email to:", adminEmail);
    return;
  }

  try {
    const updatePaymentUrl = `${APP_URL}/admin/settings/billing`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `⚠️ Payment Failed for ${orgName} - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: bold; margin: 0;">👋 GreetNow</h1>
            </div>

            <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #dc2626;">⚠️ Payment Failed</h2>
              <p style="margin: 0 0 16px 0;">We were unable to process the payment for <strong>${orgName}</strong>'s GreetNow subscription.</p>
              <p style="margin: 0 0 16px 0;">This usually happens when:</p>
              <ul style="margin: 0 0 24px 0; padding-left: 20px;">
                <li>Your card has expired</li>
                <li>There are insufficient funds</li>
                <li>Your card was declined</li>
              </ul>
              <p style="margin: 0 0 24px 0;"><strong>Please update your payment method to avoid service interruption.</strong></p>

              <a href="${updatePaymentUrl}" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                Update Payment Method
              </a>
            </div>

            <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What happens next?</h3>
              <p style="margin: 0 0 12px 0; font-size: 14px;">We'll automatically retry the payment over the next few days. If the payment continues to fail, your subscription may be cancelled.</p>
              <p style="margin: 0; font-size: 14px;">To ensure uninterrupted service, please update your payment information as soon as possible.</p>
            </div>

            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              Need help? Reply to this email or contact our support team.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Can't click the button? Copy and paste this link:<br>
              <a href="${updatePaymentUrl}" style="color: #6366f1;">${updatePaymentUrl}</a>
            </p>
          </body>
        </html>
      `,
    });

    console.log(`[Email] Payment failure notification sent to ${adminEmail} for org: ${orgName}`);
  } catch (error) {
    console.error("[Email] Failed to send payment failure email:", error);
    // Don't throw - we don't want to fail the webhook if email fails
  }
}
