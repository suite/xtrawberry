export async function sendToDiscordWebhook(message: string, logger: (msg: string) => void): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message
        })
      });
    } catch (error) {
      logger(`Failed to send to Discord: ${error}`);
    }
  }
} 