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

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
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
    process.env.EMAIL_FROM || process.env.SMTP_USER;

  const fromName =
    process.env.EMAIL_FROM_NAME || 'EAZY DON CHECK';

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
};

module.exports = sendEmail;