import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  const clientId = process.env.EMAIL_CLIENT_ID;
  const clientSecret = process.env.EMAIL_CLIENT_SECRET;
  const refreshToken = process.env.EMAIL_REFRESH_TOKEN;

  const from = process.env.EMAIL_FROM || user || 'no-reply@restaurant.com';

  let transporter;

  // 1. Check if Gmail OAuth2 Credentials are set
  if (clientId && clientSecret && refreshToken && user) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user,
        clientId,
        clientSecret,
        refreshToken
      }
    });
  }
  // 2. Check if Standard SMTP Credentials are set
  else if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: {
        user,
        pass
      }
    });
  }
  // 3. Fallback to console printing in development
  else {
    console.log('\n==================================================');
    console.log(`[EMAIL SEND MOCK]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML):\n${html}`);
    console.log('==================================================\n');
    return { mock: true };
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Restaurant Admin'}" <${from}>`,
    to,
    subject,
    html
  };

  return await transporter.sendMail(mailOptions);
};

export default {
  sendEmail
};
