// 1. Función para limpiar el texto de caracteres que traban al TTS
const cleanTextForSpeech = (text) => {
  return text
    .replace(/[$]/g, " dólares ") // Cambia $ por la palabra para fluidez
    .replace(/[-]/g, " menos ")   // Cambia el guion de utilidad negativa por "menos"
    .replace(/[*_#]/g, "")        // Elimina basura de markdown
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

    // Limpiamos el texto antes de mandarlo a ElevenLabs/TTS
    const speechText = cleanTextForSpeech(lastMessage.content);

    // Pequeño delay de seguridad para que el estado de React se asiente
    const timer = setTimeout(() => {
      if (playAudio) {
        console.log("Reproduciendo locución completa...");
        playAudio(speechText);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [lastMessage, isActive, playAudio]);

  return null; // Este componente es un controlador lógico
}