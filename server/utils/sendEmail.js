const nodemailer = require('nodemailer');

const createTransporter = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
  } = process.env;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASSWORD
  ) {
    throw new Error(
      'SMTP email configuration is missing. Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD.'
    );
  }

  const port = Number(SMTP_PORT);

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,

    // Force IPv4 so Render does not try
    // to connect to Gmail through an unreachable IPv6 route.
    family: 4,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

const sendEmail = async ({
  to,
  subject,
  html,
  text,
}) => {
  const transporter = createTransporter();

  const fromEmail =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER;

  const fromName =
    process.env.EMAIL_FROM_NAME ||
    'EAZY DON CHECK';

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(
      `📧 Email sent successfully to ${to}: ${info.messageId}`
    );

    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
    });

    throw error;
  }
};

module.exports = sendEmail;