Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { audio } = await req.json();

    if (!audio) {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }

    const apiKey = Deno.env.get("ELEVEN_LABS_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    // Convert base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append("audio", new Blob([bytes], { type: "audio/webm" }));

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Eleven Labs STT error:", errorData);
      return Response.json(
        { error: "STT processing failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ transcript: data.text || "" });
  } catch (error) {
    console.error("STT function error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});