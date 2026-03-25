import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const { items, customer, orderType, deliveryFee, deliveryAddress } = await req.json();

    if (!items || !items.length) {
      return Response.json({ error: "No items provided" }, { status: 400 });
    }

    const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    const origin = req.headers.get("Origin") || "https://app.base44.com";

    const cartItems = items.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      price: parseFloat(item.price).toFixed(2),
    }));

    // Add delivery fee as a line item if applicable
    if (deliveryFee && deliveryFee > 0) {
      cartItems.push({
        name: `Cargo delivery (${orderType === "delivery" ? "40" : "0"}%)`,
        quantity: 1,
        price: parseFloat(deliveryFee).toFixed(2),
      });
    }

    // Pass customer metadata as custom text fields so the webhook can read them
    const customTextFields = [];
    if (customer?.name) customTextFields.push({ title: "customer_name", value: customer.name });
    if (customer?.phone) customTextFields.push({ title: "customer_phone", value: customer.phone });
    if (customer?.email) customTextFields.push({ title: "customer_email", value: customer.email });
    customTextFields.push({ title: "opted_in_sms", value: customer?.opted_in_sms ? "true" : "false" });
    customTextFields.push({ title: "opted_in_email", value: customer?.opted_in_email ? "true" : "false" });
    customTextFields.push({ title: "order_type", value: orderType || "pickup" });
    if (deliveryAddress) customTextFields.push({ title: "delivery_address", value: deliveryAddress });

    const body = {
      cart: { items: cartItems },
      callbackUrls: {
        postFlowUrl: `${origin}/OrderOnline`,
        thankYouPageUrl: `${origin}/OrderConfirmation`,
      },
    };

    if (customTextFields.length > 0) {
      body.customTextFields = customTextFields;
    }

    const response = await fetch(
      "https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: WIX_API_KEY,
          "wix-site-id": WIX_SITE_ID,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Wix Payments error:", JSON.stringify(data));
      return Response.json({ error: data.message || "Payment error" }, { status: response.status });
    }

    return Response.json({ redirectUrl: data.checkoutSession.redirectUrl }, { status: 200 });
  } catch (err) {
    console.error("create-checkout error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});