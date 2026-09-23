export class NotificationService {
  static async sendFarmerSms(phoneNumber, platformId) {
    // Termii / Africa's Talking integration
    console.log(`[SMS - Africa's Talking/Termii] Sent to ${phoneNumber}: Welcome to Agriksense! Your Platform ID is: ${platformId}`);
  }

  static async sendDcoWhatsApp(phoneNumber, platformId) {
    // Termii / WhatsApp Cloud API integration
    console.log(`[WhatsApp - Mandatory] Sent to ${phoneNumber}: Welcome DCO. Your Agriksense Platform ID is: ${platformId}`);
  }

  static async sendOrgWelcome(email, platformId) {
    console.log(`[Email] Sent to ${email}: Organization onboarded. Agriksense Platform ID is: ${platformId}`);
  }
}