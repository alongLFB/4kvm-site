import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let cachedTransporter: Transporter | null = null;

/**
 * 获取或创建基于环境变量配置的 SMTP 邮件发送器
 */
function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1"
      : port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

/**
 * 通用邮件发送函数 (优先 SMTP，次选 Resend，未配置时打印日志)
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<{ success: boolean; provider: string; error?: string }> {
  const { to, subject, html, text } = options;
  const transporter = getSmtpTransporter();

  // 1. 优先使用自有 / 自建 SMTP 邮件服务 (如 QQ邮箱、163、腾讯企业邮、Gmail 等)
  if (transporter) {
    try {
      const from =
        process.env.SMTP_FROM ||
        process.env.AUTH_FROM_EMAIL ||
        `"4KVM 在线影视" <${process.env.SMTP_USER}>`;

      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ""),
      });

      console.info(
        `[Email] 成功通过 SMTP (${process.env.SMTP_HOST}) 发送邮件至: ${to}`,
      );
      return { success: true, provider: "smtp" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Email] 通过 SMTP 发送邮件失败:", msg);
      // 继续尝试 Resend 作为备选
    }
  }

  // 2. 备用：Resend REST API 发信
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const fromEmail = process.env.AUTH_FROM_EMAIL || "noreply@alonglfb.com";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Resend 响应错误 ${res.status}: ${errorText}`);
      }

      console.info(`[Email] 成功通过 Resend 发送邮件至: ${to}`);
      return { success: true, provider: "resend" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Email] 通过 Resend 发送邮件失败:", msg);
    }
  }

  // 3. 兜底回退：若未配置发信服务，仅在服务器控制台打印
  console.info(
    `[Email Log Only] 当前未配置 SMTP 或 Resend 凭据，邮件仅在服务端日志记录: to=${to} subject="${subject}"`,
  );
  return { success: false, provider: "none" };
}
