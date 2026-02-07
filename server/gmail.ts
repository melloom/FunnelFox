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

function buildRawEmail(to: string, subject: string, body: string, fromName?: string): string {
  const boundary = 'boundary_' + Date.now();
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
    body,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body.split('\n').map(line => line ? `<p>${line}</p>` : '<br/>').join('\n'),
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
