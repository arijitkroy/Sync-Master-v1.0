import nodemailer from 'nodemailer';
import { withSessionRoute } from '../../lib/withSession.js';
import { getSession } from '../../lib/session.js';
import { getUserById } from '../../lib/database.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);

    if (!session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { message } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message body is required.' });
    }

    const supportEmail = process.env.CONTACT_SUPPORT_EMAIL;
    if (!supportEmail) {
      console.error('CONTACT_SUPPORT_EMAIL env var is not set.');
      return res.status(500).json({ message: 'Support email is not configured.' });
    }

    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingEnv = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missingEnv.length > 0) {
      console.error('Missing SMTP configuration:', missingEnv);
      return res.status(500).json({ message: 'Email service is not configured.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let userEmail = session.userEmail || session.email || null;
    if (!userEmail && session.userId) {
      const userRecord = await getUserById(session.userId);
      userEmail = userRecord?.email || null;
    }
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: supportEmail,
      subject: `Sync Master contact message${userEmail ? ` from ${userEmail}` : ''}`,
      text: message.trim(),
    };

    if (userEmail) {
      mailOptions.replyTo = userEmail;
    }

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Error sending contact message:', error);
    return res.status(500).json({ message: 'Failed to send message.' });
  }
}

export default withSessionRoute(handler);
