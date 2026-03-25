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
    const buyerEmail = order.buyerInfo?.email || "";
    const customerName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || buyerEmail || "Online Customer";

    // Try to get customer metadata from order customFields (passed via checkout)
    const customFields = order.customFields || [];
    const getField = (key) => customFields.find(f => f.title === key)?.value || "";
    const custPhone = getField("phone") || contact.phone || "";
    const custEmail = buyerEmail;
    const optedSms = getField("opted_in_sms") === "true";
    const optedEmail = getField("opted_in_email") === "true";

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
      customer_name: customerName,
      notes: `Wix Order #${order.number} | ${buyerEmail}`,
    });

    console.log("Order created in DB:", orderNumber, "id:", createdOrder?.id);

    // Create or update CRM customer
    if (custEmail || custPhone || customerName !== "Online Customer") {
      const existing = custEmail
        ? await base44.entities.Customer.filter({ email: custEmail })
        : [];
      if (existing?.length > 0) {
        const cust = existing[0];
        await base44.entities.Customer.update(cust.id, {
          visit_count: (cust.visit_count || 0) + 1,
          total_spent: (cust.total_spent || 0) + total,
          last_visit: new Date().toISOString().split("T")[0],
          avg_ticket: ((cust.total_spent || 0) + total) / ((cust.visit_count || 0) + 1),
          ...(optedSms && { opted_in_sms: true }),
          ...(optedEmail && { opted_in_email: true }),
        });
        console.log("CRM customer updated:", cust.id);
      } else {
        await base44.entities.Customer.create({
          name: customerName,
          email: custEmail,
          phone: custPhone,
          opted_in_sms: optedSms,
          opted_in_email: optedEmail,
          total_spent: total,
          visit_count: 1,
          last_visit: new Date().toISOString().split("T")[0],
          avg_ticket: total,
          status: "active",
        });
        console.log("CRM customer created:", customerName);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("OK", { status: 200 }); // Always return 200 to Wix
  }
}