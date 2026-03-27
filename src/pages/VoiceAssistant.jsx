import React, { useEffect, useRef } from "react";

// 1. Función para limpiar el texto de caracteres que traban al TTS
const cleanTextForSpeech = (text) => {
  if (!text) return "";
  return text
    .replace(/[$]/g, " dólares ") // Cambia $ por la palabra para fluidez
    .replace(/[-]/g, " menos ")   // Cambia el guion de utilidad negativa por "menos"
    .replace(/[*_#]/g, "")        // Elimina basura de markdown (negritas, listas)
    .replace(/(\d+)\.(\d+)/g, "$1 punto $2") // Mejora la lectura de decimales (8.32 -> 8 punto 32)
    .trim();
};

export default function VoiceAssistant({ lastMessage, playAudio, stopAudio, isActive }) {
  const processedIdRef = useRef(null);

  useEffect(() => {
    // Si no hay mensaje, es del usuario, o ya se procesó este ID, no hacer nada
    if (!lastMessage || lastMessage.role !== "assistant" || lastMessage.id === processedIdRef.current || !isActive) {
      return;
    }

    // Marcamos como procesado inmediatamente para evitar loops
    processedIdRef.current = lastMessage.id;

    // Detenemos cualquier audio anterior antes de empezar el nuevo para evitar solapamientos
    if (stopAudio) stopAudio();

    // Limpiamos el texto antes de mandarlo a ElevenLabs/TTS
    const speechText = cleanTextForSpeech(lastMessage.content);

    // Pequeño delay de seguridad para que el estado de React se asiente
    const timer = setTimeout(() => {
      if (playAudio && speechText) {
        console.log("📢 Reproduciendo locución completa:", speechText);
        playAudio(speechText);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [lastMessage, isActive, playAudio, stopAudio]);

  return null; // Este componente es un controlador lógico, no renderiza UI
}