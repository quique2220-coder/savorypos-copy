import React, { useState, useEffect, useRef } from "react";

// ... otros imports

export default function VoiceAssistant({ lastMessage, playAudio, stopAudio }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const processedIdRef = useRef(null);

  useEffect(() => {
    // 1. Validamos que el mensaje sea nuevo y sea del asistente
    if (lastMessage?.role === "assistant" && lastMessage.id !== processedIdRef.current) {
      
      // 2. Limpiamos el texto de metadatos técnicos (Snapshot, Instrucciones) 
      // para que la voz no intente leer código JSON
      let cleanText = lastMessage.content;
      if (cleanText.includes("USER_QUERY:")) {
        cleanText = cleanText.split("INSTRUCTION:")[0] || cleanText;
      }

      // 3. Detenemos cualquier audio previo para evitar solapamiento
      if (stopAudio) stopAudio();
      
      processedIdRef.current = lastMessage.id;
      setIsSpeaking(true);

      // 4. Pequeño delay de 100ms para asegurar que el buffer esté listo
      setTimeout(() => {
        if (playAudio) {
          playAudio(cleanText);
        }
      }, 100);
    }
  }, [lastMessage, playAudio, stopAudio]);

  // ... resto del componente
}