import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send email with automatic retry logic (up to 3 attempts)
 * Returns success/failure status after all retries exhausted
 */
export async function sendEmailWithRetry(
  params: SendEmailParams,
  maxAttempts = 3
): Promise<SendEmailResult> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured - email not sent");
    return { success: false, error: "Email service not configured" };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await resend.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      console.log(`Email sent successfully to ${params.to} (attempt ${attempt}/${maxAttempts})`);
      return { success: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Email send attempt ${attempt}/${maxAttempts} failed:`, lastError.message);

      // If this wasn't the last attempt, wait before retrying
      if (attempt < maxAttempts) {
        const delayMs = attempt * 1000; // 1s, 2s backoff
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError?.message ?? "Unknown error",
  };
}

/**
 * Send invite email with retry logic
 */
export async function sendInviteEmail({
  to,
  fullName,
  orgName,
  inviteUrl,
  role,
}: {
  to: string;
  fullName: string;
  orgName: string;
  inviteUrl: string;
  role: string;
}): Promise<SendEmailResult> {
  return sendEmailWithRetry({
    from: process.env.RESEND_FROM_EMAIL || "GreetNow <noreply@greetnow.com>",
    to,
    subject: `You've been invited to join ${orgName} on GreetNow`,
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

          <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
            <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi ${fullName}!</h2>
            <p style="margin: 0 0 16px 0;">You've been invited to join <strong>${orgName}</strong> on GreetNow as ${role === 'admin' ? 'an Admin' : 'an Agent'}.</p>
            <p style="margin: 0 0 24px 0;">Click the button below to set up your account and get started:</p>

            <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            This invitation expires in 7 days.<br>
            If you didn't expect this invitation, you can ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Can't click the button? Copy and paste this link:<br>
            <a href="${inviteUrl}" style="color: #6366f1;">${inviteUrl}</a>
          </p>
        </body>
      </html>
    `,
  });
}
