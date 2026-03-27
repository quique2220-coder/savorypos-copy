import React, { useEffect, useRef } from "react";

const cleanTextForSpeech = (text) => {
  if (!text) return "";
  return text
    .replace(/[*#_]/g, "")
    .replace(/\$/g, " pesos ")
    .replace(/-/g, " menos ")
    .replace(/%/g, " por ciento")
    .replace(/(\d+)\.(\d+)/g, "$1 punto $2")
    .replace(/\n/g, ". ")
    .trim();
};

export default function VoiceAssistant({ lastMessage, playAudio, stopAudio, isActive }) {
  const processedIdRef = useRef(null);
  const audioInstanceRef = useRef(null); // Referencia persistente al audio actual

  useEffect(() => {
    // 1. Guard Rail: Evitar ejecuciones duplicadas o en pestañas inactivas
    if (
      !lastMessage || 
      lastMessage.role !== "assistant" || 
      lastMessage.id === processedIdRef.current || 
      !isActive
    ) return;

    processedIdRef.current = lastMessage.id;

    // 2. Limpieza de texto
    const speechText = cleanTextForSpeech(lastMessage.content);
    if (!speechText) return;

    // 3. Sistema de Interrupción Limpia
    // Forzamos la detención del audio anterior antes de pedir el nuevo
    if (stopAudio) stopAudio();

    // 4. DESACOPLAMIENTO (RequestAnimationFrame)
    // Esperamos a que el navegador esté "ocioso" (idle) para disparar el audio.
    // Esto evita que el renderizado de la UI (tablas/gráficos) corte el proceso de ElevenLabs.
    const startAudioStream = () => {
      if (playAudio) {
        console.log("🚀 Despachando audio blindado...");
        playAudio(speechText);
      }
    };

    // Usamos un pequeño delay técnico para salir del ciclo de renderizado de React
    const timeoutId = setTimeout(() => {
      window.requestAnimationFrame(startAudioStream);
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [lastMessage?.id, isActive]); // Solo dependemos del ID y el estado activo

  return null;
}