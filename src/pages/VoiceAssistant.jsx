import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Loader2, MessageCircle, X, Volume2 } from "lucide-react";
import { toast } from "sonner";

export default function VoiceAssistant() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // Inicializar conversación
  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "voiceAssistant",
          metadata: {
            name: "Voice Assistant Session",
            description: "Session de asistente de voz",
          },
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } catch (err) {
        console.error("Error creating conversation:", err);
        toast.error("Error al iniciar el asistente");
      }
    };
    initConversation();
  }, []);

  // Subscribe a actualizaciones
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(
      conversationId,
      (data) => {
        setMessages(data.messages || []);
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Eleven Labs Speech-to-Text
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await sendAudioToElevenLabs(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("No se puede acceder al micrófono");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
  };

  const sendAudioToElevenLabs = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await base44.functions.invoke("elevenLabsSTT", { audio: audioBlob });
      setInput(response.data.transcript || "");
    } catch (err) {
      console.error("Eleven Labs STT error:", err);
      toast.error("Error en transcripción de voz");
    }
  };

  // Eleven Labs Text-to-Speech
  const speakMessage = async (text) => {
    if (!text.trim()) return;
    
    try {
      setIsSpeaking(true);
      const response = await base44.functions.invoke("elevenLabsTTS", { text });
      
      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (err) {
      console.error("Eleven Labs TTS error:", err);
      toast.error("Error en síntesis de voz");
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      await base44.agents.addMessage(
        { id: conversationId },
        { role: "user", content: userMessage }
      );
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Error al enviar mensaje");
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getWhatsAppURL = () => {
    return base44.agents.getWhatsAppConnectURL("voiceAssistant");
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full gap-4">
        {/* Header */}
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Asistente de Voz
              </CardTitle>
              {/* WhatsApp Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWhatsApp(!showWhatsApp)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingredientes • Recetas • Reportes • Contabilidad
            </p>

            {showWhatsApp && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-green-700">
                    Conecta con WhatsApp
                  </span>
                  <button onClick={() => setShowWhatsApp(false)}>
                    <X className="w-3.5 h-3.5 text-green-600" />
                  </button>
                </div>
                <a
                  href={getWhatsAppURL()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-green-700 bg-white border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                >
                  💬 Abrir en WhatsApp
                </a>
                <p className="text-[11px] text-green-600 mt-2">
                  Accede al asistente desde WhatsApp sin salir de la app
                </p>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Messages */}
        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-3">
                <Mic className="w-12 h-12 mx-auto text-primary/30" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Bienvenido al Asistente de Voz
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pregunta sobre ingredientes, recetas, reportes o contabilidad
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card border border-border rounded-bl-none"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">
                      {msg.content}
                    </p>
                    {msg.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 -mt-0.5"
                        onClick={() => speakMessage(msg.content)}
                        disabled={isSpeaking}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Tool Calls Display */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current border-opacity-20 space-y-1">
                      {msg.tool_calls.map((tc, tcIdx) => (
                        <div
                          key={tcIdx}
                          className="text-[11px] opacity-80 flex items-center gap-1"
                        >
                          {tc.status === "completed" ? (
                            <span>✓ {tc.name}</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {tc.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-card border border-border rounded-lg rounded-bl-none px-4 py-2.5">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <Card className="shrink-0">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Button
                variant={isListening ? "default" : "outline"}
                size="icon"
                onClick={toggleMic}
                disabled={isLoading}
                className="shrink-0"
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
              <Input
                placeholder="Escribe o habla..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleSendMessage()
                }
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}