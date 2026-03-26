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
  const recognitionRef = useRef(null);

  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "voiceAssistant",
          metadata: { name: "Voice Assistant Session" },
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

  const lastSpokenIdRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      setIsLoading(false);

      // Auto-speak the latest assistant message if it's new and complete
      const lastMsg = msgs[msgs.length - 1];
      if (
        lastMsg &&
        lastMsg.role === "assistant" &&
        lastMsg.content &&
        lastMsg.id !== lastSpokenIdRef.current
      ) {
        lastSpokenIdRef.current = lastMsg.id;
        speakMessage(lastMsg.content);
      }
    });
    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language?.startsWith("en") ? "en-US" : "es-MX";
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = "";
    let silenceTimer = null;

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + " ";
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      setInput((finalTranscript + interim).trim());

      // Reset silence timer — auto-stop after 2.5s of silence
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, 2500);
    };

    recognition.onerror = (e) => {
      if (e.error !== "no-speech") toast.error("Error al reconocer voz: " + e.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      clearTimeout(silenceTimer);
      setIsListening(false);
      // Auto-send if we captured something
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    finalTranscript = "";
    recognition.start();
    setIsListening(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speakMessage = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language?.startsWith("en") ? "en-US" : "es-MX";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: userMessage });
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Error al enviar mensaje");
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full gap-4">
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Asistente de Voz
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowWhatsApp(!showWhatsApp)}>
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
                  <span className="text-xs font-semibold text-green-700">Conecta con WhatsApp</span>
                  <button onClick={() => setShowWhatsApp(false)}>
                    <X className="w-3.5 h-3.5 text-green-600" />
                  </button>
                </div>
                <a
                  href={base44.agents.getWhatsAppConnectURL("voiceAssistant")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-green-700 bg-white border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                >
                  💬 Abrir en WhatsApp
                </a>
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-3">
                <Mic className="w-12 h-12 mx-auto text-primary/30" />
                <div>
                  <p className="text-sm font-medium">Bienvenido al Asistente de Voz</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pregunta sobre ingredientes, recetas, reportes o contabilidad
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-card border border-border rounded-bl-none"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">{msg.content}</p>
                    {msg.role === "assistant" && msg.content && (
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
                  {msg.tool_calls?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current border-opacity-20 space-y-1">
                      {msg.tool_calls.map((tc, tcIdx) => (
                        <div key={tcIdx} className="text-[11px] opacity-80 flex items-center gap-1">
                          {tc.status === "completed" ? (
                            <span>✓ {tc.name}</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />{tc.name}
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

        <Card className="shrink-0">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2">
              <Button
                variant="default"
                size="icon"
                onClick={isListening ? stopRecording : startRecording}
                disabled={isLoading}
                className={isListening ? "animate-pulse bg-destructive hover:bg-destructive/90" : ""}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                placeholder="Escribe o usa el micrófono..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {isListening && (
              <p className="text-xs text-primary mt-2 text-center animate-pulse">🎤 Escuchando... habla ahora</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}