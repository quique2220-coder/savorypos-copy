import React, { useEffect, useRef } from "react";

const cleanTextForSpeech = (text) => {
  if (!text) return "";
  return text
    .replace(/[*#_]/g, "")
    .replace(/(\d+)\s*,\s*(\d+)/g, '$1 $2') 
    .replace(/\$/g, " pesos ")
    .replace(/-/g, " menos ")
    .replace(/%/g, " por ciento")
    .replace(/(\d+)\.(\d+)/g, "$1 punto $2")
    .replace(/\n/g, ". ")
    .replace(/Next:/gi, ". Plan de acción: ") 
    .trim();
};

export default function VoiceAssistant({ lastMessage, playAudio, stopAudio, isActive }) {
  const processedIdRef = useRef(null);
  const audioBlobRef = useRef(null);

  useEffect(() => {
    if (!lastMessage || lastMessage.role !== "assistant" || !isActive) return;
    if (lastMessage.id === processedIdRef.current) return;

    processedIdRef.current = lastMessage.id;
    const speechText = cleanTextForSpeech(lastMessage.content);
    if (!speechText) return;

    // Detener cualquier proceso previo
    if (stopAudio) stopAudio();

    /**
     * ESTRATEGIA DE MENTOR BLINDADO:
     * En lugar de llamar a playAudio directamente, envolvemos la ejecución
     * en un proceso de baja prioridad para que no compita con el renderizado 
     * de las gráficas de Ventas y Utilidad.
     */
    const renderCriticalDataFirst = () => {
      // Damos 500ms para que las gráficas rojas de "Utilidad" se dibujen
      setTimeout(() => {
        if (playAudio && isActive) {
          console.log("🎙️ Mentor analizando datos críticos...");
          playAudio(speechText);
        }
      }, 500);
    };

    // Usamos requestAnimationFrame para asegurar que la UI esté lista
    window.requestAnimationFrame(renderCriticalDataFirst);

  }, [lastMessage?.id, isActive]);

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none">
      {isActive && lastMessage?.role === "assistant" && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-white/90 backdrop-blur-md border-l-4 border-orange-500 p-3 shadow-2xl rounded-r-xl max-w-xs pointer-events-auto">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter">
                Mentoría en tiempo real
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight italic">
              "Analizando tu margen de <b>{lastMessage.content.includes('-') ? 'pérdida' : 'ganancia'}</b> actual..."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}