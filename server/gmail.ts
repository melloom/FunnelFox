// Email integration via Hostinger SMTP (nodemailer)
import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASSWORD || '';
const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
const smtpFromName = process.env.SMTP_FROM_NAME || 'FunnelFox';

function getTransporter() {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHtmlEmail(body: string, fromName?: string): string {
  const paragraphs = body.split('\n').map(line => {
    if (!line.trim()) return '';
    return `<p style="margin:0 0 12px 0;line-height:1.6;color:#374151;font-size:15px;">${escapeHtml(line)}</p>`;
  }).join('\n');

  const senderSignature = fromName
    ? `<p style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;line-height:1.5;">
        Best regards,<br/>
        <strong style="color:#374151;">${escapeHtml(fromName)}</strong>
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#f3f4f6;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;width:100%;">
          <tr>
            <td style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:32px 32px 24px 32px;">
                    ${paragraphs}
                    ${senderSignature}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
                Sent via FunnelFox by MellowSites
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(to: string, subject: string, body: string, fromName?: string): Promise<{ messageId: string; threadId: string }> {
  const transporter = getTransporter();
  const senderName = fromName || smtpFromName;
  const htmlContent = buildHtmlEmail(body, senderName);
  const textContent = body + (senderName ? `\n\nBest regards,\n${senderName}` : '');

  const info = await transporter.sendMail({
    from: `"${senderName}" <${smtpFromEmail}>`,
    to,
    subject,
    text: textContent,
    html: htmlContent,
  });

  return {
    messageId: info.messageId || '',
    threadId: '',
  };
}

export async function isGmailConnected(): Promise<boolean> {
  if (!smtpUser || !smtpPass) {
    return false;
  }
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return true;
  } catch (err) {
    console.error("SMTP connection check failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function getGmailAddress(): Promise<string | null> {
  if (!smtpUser) return null;
  return smtpFromEmail || smtpUser;
}
