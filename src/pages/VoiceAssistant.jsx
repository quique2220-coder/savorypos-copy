import React, { useEffect, useRef } from "react";

const cleanTextForSpeech = (text) => {
  if (!text) return "";
  return text
    .replace(/[*#_]/g, "") // Limpia Markdown
    .replace(/\$/g, " pesos ") // Evita que el símbolo $ trabe el motor
    .replace(/-/g, " menos ")  // Lee utilidades negativas correctamente
    .replace(/%/g, " por ciento")
    .replace(/(\d+)\.(\d+)/g, "$1 punto $2") // Lee decimales fluido
    .replace(/\n/g, ". ") // Cambia saltos de línea por pausas de punto
    .replace(/\.\s*\./g, ".") // Evita doble punto
    .trim();
};

export default function VoiceAssistant({ lastMessage, playAudio, stopAudio, isActive }) {
  const processedIdRef = useRef(null);
  const audioQueueRef = useRef(null);

  useEffect(() => {
    // Solo procesamos mensajes nuevos del asistente mientras la pestaña esté activa
    if (
      !lastMessage || 
      lastMessage.role !== "assistant" || 
      lastMessage.id === processedIdRef.current || 
      !isActive
    ) return;

    // Bloqueamos repeticiones
    processedIdRef.current = lastMessage.id;

    // 1. Limpieza profunda del texto
    const speechText = cleanTextForSpeech(lastMessage.content);

    // 2. Cancelamos cualquier audio que se esté reproduciendo actualmente
    if (stopAudio) stopAudio();
    if (audioQueueRef.current) {
        clearTimeout(audioQueueRef.current);
    }

    // 3. Delay de "Asentamiento": Esperamos a que el DOM termine de renderizar
    // para que el procesador se enfoque 100% en el audio.
    audioQueueRef.current = setTimeout(() => {
      if (playAudio && speechText.length > 0) {
        console.log("🎙️ Iniciando narración completa:", speechText);
        playAudio(speechText);
      }
    }, 300); // 300ms es el "sweet spot" para evitar cortes en React

    return () => {
        if (audioQueueRef.current) clearTimeout(audioQueueRef.current);
    };
  }, [lastMessage, isActive, playAudio, stopAudio]);

  return null;
}