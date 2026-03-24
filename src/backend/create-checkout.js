export async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const { items } = await req.json();

    if (!items || !items.length) {
      return new Response(JSON.stringify({ error: "No items provided" }), { status: 400 });
    }

    const WIX_API_KEY = process.env.WIX_PAYMENTS_API_KEY;
    const WIX_SITE_ID = process.env.WIX_PAYMENTS_SITE_ID;

    const origin = req.headers.get("Origin") || "https://app.base44.com";
    const baseUrl = origin;

    const cartItems = items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price).toFixed(2),
    }));

    const response = await fetch(
      "https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: WIX_API_KEY,
          "wix-site-id": WIX_SITE_ID,
        },
        body: JSON.stringify({
          cart: { items: cartItems },
          callbackUrls: {
            postFlowUrl: `${baseUrl}/OrderOnline`,
            thankYouPageUrl: `${baseUrl}/OrderConfirmation`,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Wix Payments error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.message || "Payment error" }), {
        status: response.status,
      });
    }

    return new Response(
      JSON.stringify({ redirectUrl: data.checkoutSession.redirectUrl }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}