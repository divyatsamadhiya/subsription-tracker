import { spawn } from "node:child_process";
import { config } from "../config.js";

interface PasswordResetEmailInput {
  toEmail: string;
  resetCode: string;
  expiresAt: Date;
}

const fromHeader = (): string => {
  return `${config.email.fromName} <${config.email.fromAddress}>`;
};

const buildTextBody = (resetCode: string, expiresAt: Date): string => {
  return [
    "We received a request to reset your Pulseboard password.",
    "",
    `Reset code: ${resetCode}`,
    `Expires at (UTC): ${expiresAt.toISOString()}`,
    "",
    "If you did not request this reset, you can ignore this email."
  ].join("\n");
};

const sendWithSendmail = async (toEmail: string, subject: string, body: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(config.email.sendmailPath, ["-t", "-i"], {
      stdio: ["pipe", "ignore", "pipe"]
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `sendmail exited with code ${code}`));
    });

    const message = [
      `From: ${fromHeader()}`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body
    ].join("\n");

    child.stdin.end(message, "utf8");
  });
};

const sendWithResend = async (toEmail: string, subject: string, body: string): Promise<void> => {
  const apiKey = config.email.resendApiKey;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from: fromHeader(),
      to: [toEmail],
      subject,
      text: body
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resend API request failed (${response.status}): ${details}`);
  }
};

export const sendPasswordResetEmail = async (input: PasswordResetEmailInput): Promise<void> => {
  const subject = "Your Pulseboard password reset code";
  const body = buildTextBody(input.resetCode, input.expiresAt);

  if (config.email.resendApiKey) {
    await sendWithResend(input.toEmail, subject, body);
    return;
  }

  if (!config.email.allowSendmailFallback) {
    throw new Error(
      "Email provider is not configured. Set RESEND_API_KEY or enable ALLOW_SENDMAIL_FALLBACK=true."
    );
  }

  await sendWithSendmail(input.toEmail, subject, body);
};
