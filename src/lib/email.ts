import nodemailer from "nodemailer";
import { db } from "@/lib/db";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendEmail(to: string, subject: string, html: string, type: string) {
  try {
    await transporter.sendMail({
      from: `"ContentForge AI" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    await db.emailLog.create({
      data: { to, subject, type, status: "sent" },
    });
  } catch (error) {
    await db.emailLog.create({
      data: { to, subject, type, status: "failed", error: String(error) },
    });
    console.error("Email send failed:", error);
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to ContentForge AI</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #6366f1; font-size: 28px; margin: 0;">ContentForge AI</h1>
    <p style="color: #666; margin-top: 8px;">AI-Powered SEO Content at Scale</p>
  </div>

  <h2>Welcome, ${name}! 🎉</h2>

  <p>You're now part of ContentForge AI — the fastest way to generate SEO-optimized content that ranks.</p>

  <p><strong>Your Free plan includes:</strong></p>
  <ul>
    <li>2 AI-generated articles per month</li>
    <li>Basic SEO scoring</li>
    <li>Markdown export</li>
  </ul>

  <p>Ready to create your first article?</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
       style="background: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
      Go to Dashboard →
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">Want more? Upgrade to Starter for 10 articles/month at just $29.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    ContentForge AI · Unsubscribe
  </p>
</body>
</html>`;

  await sendEmail(email, "Welcome to ContentForge AI — Start Creating!", html, "welcome");
}

export async function sendArticleReadyEmail(email: string, name: string, articleTitle: string, articleId: string) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h1 style="color: #6366f1;">Your article is ready! ✅</h1>
  <p>Hi ${name},</p>
  <p>Your article "<strong>${articleTitle}</strong>" has been generated and is ready to review.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/articles/${articleId}"
       style="background: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
      View Article →
    </a>
  </div>
</body>
</html>`;

  await sendEmail(email, `Your article "${articleTitle}" is ready`, html, "article_ready");
}

export async function sendTrialEndingEmail(email: string, name: string, daysLeft: number) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h1 style="color: #f59e0b;">Your trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}</h1>
  <p>Hi ${name},</p>
  <p>Your ContentForge AI trial is ending soon. Don't lose access to your articles and keyword data!</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing"
       style="background: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
      Upgrade Now →
    </a>
  </div>
</body>
</html>`;

  await sendEmail(email, `Your ContentForge trial ends in ${daysLeft} days`, html, "trial_ending");
}
