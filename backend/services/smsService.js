/**
 * SMS Service for sending OTP messages
 * Currently uses console logging for development
 * Can be replaced with Twilio or other SMS providers for production
 */

const SMS_SERVICE = process.env.SMS_SERVICE || 'console';

/**
 * Send SMS message
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendSMS = async (phoneNumber, message) => {
  if (SMS_SERVICE === 'console') {
    // Development mode - log to console
    console.log('\n' + '='.repeat(60));
    console.log('SMS SERVICE (Console Mode)');
    console.log('='.repeat(60));
    console.log('To:', phoneNumber);
    console.log('Message:', message);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      messageId: `console-${Date.now()}`,
      mode: 'console'
    };
  }

  // Production mode - integrate with SMS provider
  // TODO: Add Twilio or other SMS provider integration
  if (SMS_SERVICE === 'twilio') {
    try {
      // Twilio integration placeholder
      // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // const result = await twilio.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // });
      // return { success: true, messageId: result.sid };

      throw new Error('Twilio integration not configured');
    } catch (error) {
      console.error('Twilio SMS Error:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'SMS service not configured' };
};

/**
 * Send phone verification OTP
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name for personalization
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendPhoneVerificationOTP = async (phoneNumber, otp, userName) => {
  const message = `Hello ${userName}, your AutoSphere phone verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;

  return await sendSMS(phoneNumber, message);
};

/**
 * Send vendor verification status update
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} status - Verification status (approved/rejected)
 * @param {string} businessName - Vendor's business name
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendVerificationStatusSMS = async (phoneNumber, status, businessName) => {
  let message;

  if (status === 'approved') {
    message = `Congratulations! Your vendor account for "${businessName}" on AutoSphere has been verified. You can now start selling your products.`;
  } else {
    message = `Your vendor verification for "${businessName}" on AutoSphere was not successful. Please log in to your account to retry or contact support.`;
  }

  return await sendSMS(phoneNumber, message);
};

module.exports = {
  sendSMS,
  sendPhoneVerificationOTP,
  sendVerificationStatusSMS
};
