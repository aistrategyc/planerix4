"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, SendHorizontal } from "lucide-react";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Webhook URL берём из NEXT_PUBLIC_*
  const webhook = process.env.NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL ?? "";

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      if (!webhook) {
        throw new Error("Webhook URL not configured");
      }

      const { data } = await axios.post(webhook, { query: text });
      const answer =
        data?.answer ??
        data?.data?.answer ??
        "🤖 Ответ отсутствует или недоступен.";

      setMessages((prev) => [...prev, { role: "bot", text: answer }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "❌ Ошибка при получении ответа от агента." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, webhook]);

  // Автоскролл вниз при добавлении сообщений
  useEffect(() => {
    const el = chatRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Если переменная окружения не настроена
  if (!webhook) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6">
        <h1 className="text-2xl font-bold mb-4">⚠️ Чат недоступен</h1>
        <p className="text-muted-foreground max-w-md">
          Не найден <code className="font-mono">NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL</code>.
          Добавь его в <code>.env.local</code>, чтобы подключить AI-агента.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-6 min-h-[calc(100vh-80px)]">
      <h1 className="text-2xl font-bold mb-4">💬 AI-чат с аналитическим агентом</h1>

      <div
        ref={chatRef}
        className="flex-1 bg-muted/30 border border-border rounded-xl p-4 mb-4 overflow-y-auto max-h-[60vh] space-y-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-xl text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-white border font-mono"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-muted-foreground animate-pulse">
            ⏳ AI обрабатывает ваш запрос…
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Задай вопрос, например: «Сколько было заявок за неделю?»"
          className="flex-1"
        />
        <Button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="gap-2"
          aria-label="Отправить сообщение"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <SendHorizontal size={18} />
          )}
          <span className="hidden sm:inline">Отправить</span>
        </Button>
      </div>
    </div>
  );
}