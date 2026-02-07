import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/models/auth';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '.'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString());
      console.log(`Received webhook ${event.id}: ${event.type} for ${event.data?.object?.id || 'unknown'}`);
      await WebhookHandlers.handleEvent(event);
    } catch (err) {
      console.error("Error handling webhook event:", err);
    }
  }

  static async handleEvent(event: any): Promise<void> {
    const eventType = event.type;
    const data = event.data?.object;

    if (!data) return;

    switch (eventType) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const customerId = data.customer;
        const status = data.status;
        const subscriptionId = data.id;

        const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
        if (user) {
          const planStatus = (status === 'active' || status === 'trialing') ? 'pro' : 'free';
          const nextReset = user.usageResetDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
          await db.update(users).set({
            stripeSubscriptionId: subscriptionId,
            planStatus,
            usageResetDate: nextReset,
          }).where(eq(users.id, user.id));
          console.log(`Updated user ${user.id} plan to ${planStatus} (subscription ${status})`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const customerId = data.customer;

        const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
        if (user) {
          await db.update(users).set({
            stripeSubscriptionId: null,
            planStatus: 'free',
          }).where(eq(users.id, user.id));
          console.log(`Downgraded user ${user.id} to free (subscription canceled)`);
        }
        break;
      }
    }
  }
}
