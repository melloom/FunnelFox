import { getUncachableStripeClient } from "./stripeClient";

async function seedStripeProducts() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.list({ active: true, limit: 20 });
  const existing = products.data.find(p => p.name === "FunnelFox Pro" || p.name === "LeadHunter Pro");

  if (existing) {
    console.log("FunnelFox Pro product already exists:", existing.id);
    const prices = await stripe.prices.list({ product: existing.id, active: true });
    console.log("Existing prices:", prices.data.map(p => `${p.id} - $${(p.unit_amount || 0) / 100}/${p.recurring?.interval}`));
    return;
  }

  const product = await stripe.products.create({
    name: "FunnelFox Pro",
    description: "Unlock 50 lead discoveries/month, unlimited saved leads, all data sources, Gmail integration, and full website analysis.",
    metadata: {
      plan: "pro",
      discoveryLimit: "50",
      leadLimit: "unlimited",
    },
  });
  console.log("Created product:", product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 3000,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: "pro_monthly",
  });
  console.log("Created monthly price:", monthlyPrice.id, "- $30/month");

  console.log("Stripe products seeded successfully!");
}

seedStripeProducts().catch(console.error);
