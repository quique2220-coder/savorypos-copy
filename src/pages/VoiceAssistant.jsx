import React, { useEffect, useRef } from "react";

const cleanTextForSpeech = (text) => {
  if (!text) return "";
  return text
    .replace(/[*#_]/g, "")
    .replace(/(\d+)\s*,\s*(\d+)/g, '$1 $2') // 3,530 -> 3 530
    .replace(/\$/g, " pesos ")
    .replace(/-/g, " menos ")
    .replace(/%/g, " por ciento")
    .replace(/(\d+)\.(\d+)/g, "$1 punto $2") // 569.26 -> 569 punto 26
    .replace(/\n/g, ". ")
    .replace(/Next:/gi, ". Sugerencia estratégica: ") 
    .trim();
};

export default function VoiceAssistant({ lastMessage, playAudio, stopAudio, isActive }) {
  const processedIdRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // 1. Validaciones estrictas
    if (!lastMessage || lastMessage.role !== "assistant" || !isActive) return;
    if (lastMessage.id === processedIdRef.current) return;

    // 2. Bloqueo de ID para evitar re-disparos por re-renders del Dashboard
    processedIdRef.current = lastMessage.id;

    const speechText = cleanTextForSpeech(lastMessage.content);
    if (!speechText) return;

    // 3. Limpieza de procesos anteriores
    if (stopAudio) stopAudio();
    isPlayingRef.current = false;

    // 4. ESTRATEGIA DE MENTOR: Desacoplamiento total del renderizado
    // Esperamos a que el navegador esté "Idle" (Ocioso)
    const triggerAudio = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {
          executePlay(speechText);
        }, { timeout: 500 });
      } else {
        setTimeout(() => executePlay(speechText), 600);
      }
    };

    const executePlay = (text) => {
      if (playAudio && isActive && !isPlayingRef.current) {
        isPlayingRef.current = true;
        console.log("🎙️ Mentor Iniciando Locución...");
        playAudio(text);
      }
    };

    triggerAudio();

  }, [lastMessage?.id, isActive]); // Solo dependemos del ID del mensaje

  return null;
}