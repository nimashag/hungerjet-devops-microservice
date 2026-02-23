import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logError, logInfo } from '../utils/logger';

// Load environment variables from .env file
dotenv.config();

// Create a transporter using Gmail (or another email service)
const transporter = nodemailer.createTransport({
  service: 'gmail',  
  auth: {
    user: process.env.EMAIL_USER, 
 // Use email from environment variables
    pass: process.env.EMAIL_PASS,  // Use App password from environment variables
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"HungerJet" <${process.env.EMAIL_USER}>`,  // Sender email from environment variable
      to,  // Recipient email (parameter)
      subject,  // Email subject (parameter)
      text,  // Email body (parameter)
    });
    logInfo('email.sent', { messageId: info.messageId, to });
  } catch (error) {
    logError('email.send.error', { to, subject }, error as Error);
  }
};