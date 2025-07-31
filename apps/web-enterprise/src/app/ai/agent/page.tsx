"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, SendHorizontal } from "lucide-react";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  tableData?: Array<Record<string, any>>;
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  if (message.tableData && message.tableData.length > 0) {
    const columns = Object.keys(message.tableData[0]);
    return (
      <div className={`max-w-[80%] px-4 py-2 rounded-xl text-sm shadow-sm bg-white border overflow-auto`}>
        <table className="table-auto w-full border-collapse border border-gray-300 text-left text-xs">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} className="border border-gray-300 px-2 py-1 bg-gray-100">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message.tableData.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                {columns.map((col) => (
                  <td key={col} className="border border-gray-300 px-2 py-1">
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className={`max-w-[80%] px-4 py-2 rounded-xl text-sm shadow-sm ${
        message.role === "user" ? "bg-primary text-white" : "bg-white border"
      }`}
    >
      {message.text}
    </div>
  );
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const webhook = process.env.NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL;
  if (!webhook) {
    throw new Error("NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL is not defined");
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post<{
        answer?: string;
        tableData?: Array<Record<string, any>>;
      }>(webhook, { query: text });

      const answer = data.answer ?? "🤖 Ответ отсутствует или недоступен.";
      const tableData = data.tableData ?? undefined;

      setMessages((prev) => [...prev, { role: "bot", text: answer, tableData }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "❌ Ошибка при получении ответа от агента." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, webhook]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
            <ChatMessageItem message={msg} />
          </div>
        ))}
        {loading && (
          <div className="text-sm text-muted-foreground animate-pulse">⏳ AI обрабатывает ваш запрос…</div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Задай вопрос, например: «Покажи таблицу с продажами»"
          className="flex-1"
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading || !input.trim()} className="gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
          <span className="hidden sm:inline">Отправить</span>
        </Button>
      </div>
    </div>
  );
}