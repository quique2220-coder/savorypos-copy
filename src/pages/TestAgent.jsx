import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAgent() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "testAgent",
          metadata: { name: "Test Conversation" },
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);

        const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
          setLoading(false);
        });

        return () => unsubscribe?.();
      } catch (err) {
        console.error("Error initializing:", err);
      }
    };

    init();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;
    setLoading(true);
    try {
      await base44.agents.addMessage({ id: conversationId }, { role: "user", content: input });
      setInput("");
    } catch (err) {
      console.error("Error sending message:", err);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-96 border rounded-lg p-4 overflow-auto space-y-2 bg-slate-50">
            {messages.length === 0 ? (
              <p className="text-gray-400">No messages yet...</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`px-3 py-2 rounded-lg max-w-xs ${
                    msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {loading && <p className="text-gray-400">Responding...</p>}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={!input.trim() || loading}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}