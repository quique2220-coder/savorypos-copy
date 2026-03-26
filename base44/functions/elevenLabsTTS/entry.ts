Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Invalid text input" }, { status: 400 });
    }

    const apiKey = Deno.env.get("ELEVEN_LABS_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    // Using a default voice ID (optimized_voice_id)
    const voiceId = "9BWtsMINqrJLrRacOk9x"; // Default voice - change as needed

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
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Eleven Labs TTS error:", errorData);
      return Response.json(
        { error: "TTS processing failed" },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binaryString);
    return Response.json({ audio: base64Audio });
  } catch (error) {
    console.error("TTS function error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});