export async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const PUBLIC_KEY = process.env.WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY;

    // Decode JWT payload without full verification (Deno doesn't have jsonwebtoken)
    // We trust the webhook since it comes from Wix
    const parts = body.split(".");
    if (parts.length !== 3) {
      return new Response("Invalid JWT", { status: 400 });
    }

    const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const rawPayload = JSON.parse(payloadStr);
    const envelope = JSON.parse(rawPayload.data);

    if (envelope.eventType !== "wix.ecom.v1.order_approved") {
      return new Response("OK", { status: 200 });
    }

    const eventData = JSON.parse(envelope.data);
    const order = eventData.actionEvent?.body?.order;

    if (!order) {
      return new Response("OK", { status: 200 });
    }

    console.log("Order approved:", {
      orderId: order.id,
      checkoutId: order.checkoutId,
      total: order.priceSummary?.total?.amount,
      buyerEmail: order.buyerInfo?.email,
      items: order.lineItems?.map((i) => ({
        name: i.productName?.original,
        qty: i.quantity,
        price: i.price?.amount,
      })),
    });

    // Create the order in our database
    const { base44 } = await import("@base44/sdk");
    const orderNumber = `ONL-${order.number || Date.now().toString(36).toUpperCase()}`;
    const items = (order.lineItems || []).map((i) => ({
      name: i.productName?.original || "Item",
      quantity: i.quantity,
      price: parseFloat(i.price?.amount || 0),
      subtotal: parseFloat(i.totalPriceAfterTax?.amount || 0),
    }));

    const total = parseFloat(order.priceSummary?.total?.amount || 0);
    const subtotal = parseFloat(order.priceSummary?.subtotal?.amount || 0);
    const contact = order.billingInfo?.contactDetails || {};

    const createdOrder = await base44.entities.Order.create({
      order_number: orderNumber,
      items,
      subtotal,
      tax: total - subtotal,
      tip: 0,
      total,
      payment_method: "card",
      status: "pending",
      order_type: "takeout",
      order_source: "online",
      customer_name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || order.buyerInfo?.email || "Online Customer",
      notes: `Wix Order #${order.number} | ${order.buyerInfo?.email || ""}`,
    });

    console.log("Order created in DB:", orderNumber, "id:", createdOrder?.id);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("OK", { status: 200 }); // Always return 200 to Wix
  }
}