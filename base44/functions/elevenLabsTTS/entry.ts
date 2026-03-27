Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    // Leemos el texto y las configuraciones opcionales que vengan del frontend
    const body = await req.json();
    const { text, voice_settings } = body;

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Invalid text input" }, { status: 400 });
    }

    const apiKey = Deno.env.get("ELEVEN_LABS_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    // Sarah - Voz natural bilingüe
    const voiceId = "EXAVITQu4vr4xnSDxMaL";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            // Aumentamos estabilidad para evitar que la voz se quiebre en listas largas
            stability: voice_settings?.stability || 0.65, 
            similarity_boost: voice_settings?.similarity_boost || 0.8,
            style: 0.0,
            use_speaker_boost: true
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Eleven Labs TTS error:", errorData);
      return Response.json(
        { error: "TTS processing failed", details: errorData },
        { status: response.status }
      );
    }

    // Método eficiente para convertir ArrayBuffer a Base64 en Deno
    const audioBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Usamos btoa de una forma más segura para buffers grandes
    let binary = "";
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binary);

    return Response.json({ audio: base64Audio });

  } catch (error) {
    console.error("TTS function error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});