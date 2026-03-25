import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has settings
    const existing = await base44.entities.AppSettings.filter({ key: "business" });
    
    if (existing && existing.length > 0) {
      return Response.json({ 
        message: 'Settings already exist',
        settings: existing[0]
      });
    }

    // Create default settings for new user with "growth" plan
    const newSettings = await base44.entities.AppSettings.create({
      key: "business",
      business_name: "Mi Restaurante",
      address: "",
      phone: "",
      email: user.email || "",
      tax_rate: "8.25",
      state_code: "none",
      currency: "USD",
      language: "es",
      timezone: "America/Denver",
      delivery_enabled: false,
      delivery_lat: null,
      delivery_lng: null,
      delivery_radius_miles: 5,
      delivery_fee_percent: 40,
      current_plan: "growth"
    });

    return Response.json({ 
      message: 'New user initialized with Growth plan',
      settings: newSettings
    });
  } catch (error) {
    console.error('Error initializing new user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});