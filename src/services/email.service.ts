import nodemailer, { Transporter } from 'nodemailer';

const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Welcome Email - Matches Flutter Design
export const sendWelcomeEmail = async (name: string, email: string): Promise<void> => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Welcome to ${process.env.APP_NAME}! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
              <tr>
                <td align="center">
                  <!-- Main Container -->
                  <table width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    
                    <!-- Header with Gradient -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; font-family: 'Poppins', Arial, sans-serif; letter-spacing: 0.5px;">
                          Welcome, ${name}! 🚀
                        </h1>
                      </td>
                    </tr>

                    <!-- Content Section -->
                    <tr>
                      <td style="padding: 40px 30px; background-color: #ffffff;">
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1f2937; font-family: 'Poppins', Arial, sans-serif;">
                          Hi <strong>${name}</strong>,
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1f2937; font-family: 'Poppins', Arial, sans-serif;">
                          Thank you for signing up! We're thrilled to have you join our collaborative dashboard platform.
                        </p>

                        <!-- Feature Box -->
                        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 25px 0;">
                          <tr>
                            <td style="padding: 20px; background-color: #f9fafb; border-radius: 12px; border-left: 4px solid #4F46E5;">
                              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #4F46E5; font-family: 'Poppins', Arial, sans-serif;">
                                ✨ You can now:
                              </p>
                              <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #4b5563; font-family: 'Poppins', Arial, sans-serif;">
                                <li>Create unlimited dashboards and folders</li>
                                <li>Collaborate in real-time with your team</li>
                                <li>Use voice and video communication</li>
                                <li>Access templates like Kanban and Mindmaps</li>
                              </ul>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0 20px 0;">
                          <tr>
                            <td align="center">
                              <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; border-radius: 16px; font-size: 17px; font-weight: 600; font-family: 'Poppins', Arial, sans-serif; letter-spacing: 0.5px; box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);">
                                Get Started
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 20px 0 0 0; font-size: 15px; line-height: 1.6; color: #6b7280; font-family: 'Poppins', Arial, sans-serif; text-align: center;">
                          If you have any questions, feel free to reach out to our support team.
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 15px; font-weight: 600; color: #1f2937; font-family: 'Poppins', Arial, sans-serif; text-align: center;">
                          Happy collaborating! 🎉
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 25px 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-size: 13px; color: #9ca3af; font-family: 'Poppins', Arial, sans-serif;">
                          &copy; 2025 ${process.env.APP_NAME}. All rights reserved.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};

// ✅ Login Notification Email - Matches Flutter Design
export const sendLoginNotificationEmail = async (name: string, email: string): Promise<void> => {
  try {
    const loginTime = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `New Login Detected - ${process.env.APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center;">
                        <div style="font-size: 40px; margin-bottom: 10px;">🔐</div>
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; font-family: 'Poppins', Arial, sans-serif;">
                          New Login Detected
                        </h2>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937; font-family: 'Poppins', Arial, sans-serif;">
                          Hello <strong>${name}</strong>,
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1f2937; font-family: 'Poppins', Arial, sans-serif;">
                          We detected a new login to your account.
                        </p>

                        <!-- Info Box -->
                        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 25px 0;">
                          <tr>
                            <td style="padding: 20px; background-color: #eff6ff; border-radius: 12px; border-left: 4px solid #4F46E5;">
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280; font-family: 'Poppins', Arial, sans-serif;">
                                <strong style="color: #1f2937;">Login Time:</strong>
                              </p>
                              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #4F46E5; font-family: 'Poppins', Arial, sans-serif;">
                                ${loginTime}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 20px 0 10px 0; font-size: 15px; line-height: 1.6; color: #1f2937; font-family: 'Poppins', Arial, sans-serif;">
                          If this was you, you can safely ignore this email.
                        </p>
                        
                        <!-- Warning Box -->
                        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                          <tr>
                            <td style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444;">
                              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991b1b; font-family: 'Poppins', Arial, sans-serif;">
                                <strong>⚠️ Important:</strong> If you didn't log in, please secure your account immediately by changing your password.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Button -->
                        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0 20px 0;">
                          <tr>
                            <td align="center">
                              <a href="${process.env.FRONTEND_URL}/settings/security" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; border-radius: 16px; font-size: 15px; font-weight: 600; font-family: 'Poppins', Arial, sans-serif; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                                Secure My Account
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: 'Poppins', Arial, sans-serif;">
                          This is an automated security notification from ${process.env.APP_NAME}
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Login notification sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending login notification:', error);
  }
};
