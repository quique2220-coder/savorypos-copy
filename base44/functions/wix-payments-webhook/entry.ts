import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();

    // Decode JWT payload (Wix sends a signed JWT)
    const parts = body.split(".");
    if (parts.length !== 3) {
      return new Response("Invalid JWT", { status: 400 });
    }

    const pad = (s) => s + "=".repeat((4 - s.length % 4) % 4);
    const payloadStr = atob(pad(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const rawPayload = JSON.parse(payloadStr);
    const envelope = JSON.parse(rawPayload.data);

    console.log("Webhook eventType:", envelope.eventType);

    if (envelope.eventType !== "wix.ecom.v1.order_approved") {
      return new Response("OK", { status: 200 });
    }

    const eventData = JSON.parse(envelope.data);
    const order = eventData.actionEvent?.body?.order;

    if (!order) {
      console.log("No order in payload");
      return new Response("OK", { status: 200 });
    }

    // Helper to read customTextFields by title
    const customFields = order.customTextFields || order.customFields || [];
    const getField = (key) => {
      const f = customFields.find(f => f.title === key);
      return f?.value || "";
    };

    // Extract customer info — prefer our custom fields, fall back to Wix billing info
    const contact = order.billingInfo?.contactDetails || {};
    const buyerEmail = order.buyerInfo?.email || "";
    const customerName = getField("customer_name") ||
      `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
      buyerEmail || "Online Customer";
    const custPhone = getField("customer_phone") || contact.phone || "";
    const custEmail = getField("customer_email") || buyerEmail;
    const optedSms = getField("opted_in_sms") === "true";
    const optedEmail = getField("opted_in_email") === "true";
    const orderType = getField("order_type") || "takeout";
    const deliveryAddress = getField("delivery_address") || "";

    // Order financials
    const total = parseFloat(order.priceSummary?.total?.amount || 0);
    const subtotal = parseFloat(order.priceSummary?.subtotal?.amount || 0);
    const tax = parseFloat(order.priceSummary?.tax?.amount || 0);

    const orderNumber = `ONL-${order.number || Date.now().toString(36).toUpperCase()}`;
    const items = (order.lineItems || []).map((i) => ({
      name: i.productName?.original || "Item",
      quantity: Number(i.quantity),
      price: parseFloat(i.price?.amount || 0),
      subtotal: parseFloat(i.totalPriceAfterTax?.amount || 0),
    }));

    const dbOrderType = orderType === "delivery" ? "delivery" : "takeout";
    const notes = [
      `Wix Order #${order.number}`,
      buyerEmail ? `Email: ${buyerEmail}` : "",
      deliveryAddress ? `Dirección: ${deliveryAddress}` : "",
    ].filter(Boolean).join(" | ");

    const createdOrder = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      items,
      subtotal,
      tax,
      tip: 0,
      total,
      payment_method: "card",
      status: "pending",
      order_type: dbOrderType,
      order_source: "online",
      customer_name: customerName,
      notes,
    });

    console.log("Order created:", orderNumber, "id:", createdOrder?.id);

    // CRM: create or update customer with opt-ins + loyalty points
    if (custEmail || custPhone || customerName !== "Online Customer") {
      const existing = custEmail
        ? await base44.asServiceRole.entities.Customer.filter({ email: custEmail })
        : [];

      // Loyalty: 1 point per dollar spent (rounded)
      const pointsEarned = Math.round(total);

      if (existing?.length > 0) {
        const cust = existing[0];
        const newVisits = (cust.visit_count || 0) + 1;
        const newSpent = (cust.total_spent || 0) + total;
        await base44.asServiceRole.entities.Customer.update(cust.id, {
          visit_count: newVisits,
          total_spent: newSpent,
          last_visit: new Date().toISOString().split("T")[0],
          avg_ticket: newSpent / newVisits,
          loyalty_points: (cust.loyalty_points || 0) + pointsEarned,
          ...(optedSms ? { opted_in_sms: true } : {}),
          ...(optedEmail ? { opted_in_email: true } : {}),
        });
        console.log("CRM customer updated:", cust.id, `+${pointsEarned} pts`);
      } else {
        await base44.asServiceRole.entities.Customer.create({
          name: customerName,
          email: custEmail,
          phone: custPhone,
          opted_in_sms: optedSms,
          opted_in_email: optedEmail,
          total_spent: total,
          visit_count: 1,
          last_visit: new Date().toISOString().split("T")[0],
          avg_ticket: total,
          loyalty_points: pointsEarned,
          status: "active",
        });
        console.log("CRM customer created:", customerName, `+${pointsEarned} pts`);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err.message, err.stack);
    return new Response("OK", { status: 200 }); // Always 200 to Wix
  }
});