import React, { useEffect, useRef } from "react";

/**
 * Limpieza profunda para que el TTS no se trabe con símbolos financieros
 * como los que aparecen en tu dashboard: "$569.26", "-$3,530.73", etc.
 */
const cleanTextForSpeech = (text) => {
  if (!text) return "";
  return text
    .replace(/[*#_]/g, "")                 // Limpia Markdown (negritas, listas)
    .replace(/(\d+)\s*,\s*(\d+)/g, '$1 $2') // Quita comas entre números (ej: 3,500 -> 3 500)
    .replace(/\$/g, ' pesos ')              // Símbolo de moneda a palabra
    .replace(/-/g, ' menos ')               // Para utilidades negativas como la de tu pantalla
    .replace(/%/g, ' por ciento ')
    .replace(/(\d+)\.(\d+)/g, '$1 punto $2') // Lee decimales fluido (ej: .735)
    .replace(/\n/g, '. ')                   // Pausa obligatoria en saltos de línea
    .replace(/Next:/g, ' Siguiente paso: ') // Transición humana
    .replace(/(\d+)/g, ' $1 ')              // Espaciado extra para claridad numérica
    .replace(/\s+/g, ' ')                   // Quita espacios dobles
    .trim();
};

export default function VoiceAssistant({ lastMessage, playAudio, stopAudio, isActive }) {
  const processedIdRef = useRef(null);
  const audioTimeoutRef = useRef(null);

  useEffect(() => {
    // 1. Validaciones de seguridad: Solo procesar si hay mensaje nuevo y la pestaña está activa
    if (
      !lastMessage || 
      lastMessage.role !== "assistant" || 
      lastMessage.id === processedIdRef.current || 
      !isActive
    ) {
      return;
    }

    // Marcamos el ID como procesado inmediatamente
    processedIdRef.current = lastMessage.id;

    // 2. Preparamos el texto limpio
    const speechText = cleanTextForSpeech(lastMessage.content);
    if (!speechText) return;

    // 3. Detenemos cualquier audio previo para evitar solapamientos
    if (stopAudio) stopAudio();
    if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);

    /**
     * 4. Desacoplamiento del hilo principal:
     * Usamos un delay de 400ms para permitir que React termine de renderizar
     * las tarjetas de "VENTAS", "GASTOS" y "UTILIDAD" antes de pedir el audio.
     * Esto evita que el procesamiento visual corte el stream de voz.
     */
    audioTimeoutRef.current = setTimeout(() => {
      // Usamos requestAnimationFrame para asegurar que el navegador esté "libre"
      window.requestAnimationFrame(() => {
        if (playAudio && isActive) {
          console.log("📢 Narrando datos financieros:", speechText);
          playAudio(speechText);
        }
      });
    }, 400);

    return () => {
      if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
    };
  }, [lastMessage?.id, isActive, playAudio, stopAudio]);

  return null; // Componente lógico, no requiere UI
}