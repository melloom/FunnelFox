// Gmail integration via Replit Connector (google-mail)
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
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

function buildRawEmail(to: string, subject: string, body: string, fromName?: string): string {
  const boundary = 'boundary_' + Date.now();
  const htmlContent = buildHtmlEmail(body, fromName);
  const lines = [
    fromName ? `From: ${fromName}` : '',
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body + (fromName ? `\n\nBest regards,\n${fromName}` : ''),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlContent,
    '',
    `--${boundary}--`,
  ].filter(l => l !== undefined);

  const raw = lines.join('\r\n');
  return Buffer.from(raw).toString('base64url');
}

export async function sendEmail(to: string, subject: string, body: string, fromName?: string): Promise<{ messageId: string; threadId: string }> {
  const gmail = await getUncachableGmailClient();
  const raw = buildRawEmail(to, subject, body, fromName);

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return {
    messageId: result.data.id || '',
    threadId: result.data.threadId || '',
  };
}

export async function isGmailConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch (err) {
    console.error("Gmail connection check failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function getGmailAddress(): Promise<string | null> {
  try {
    await getAccessToken();
    if (connectionSettings?.settings?.email) {
      return connectionSettings.settings.email;
    }
    return connectionSettings?.settings?.login_hint || null;
  } catch {
    return null;
  }
}
