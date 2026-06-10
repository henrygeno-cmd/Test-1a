"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, TrendingUp, Users, AlertCircle, Lightbulb, Loader2 } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Summarize my hottest leads", prompt: "Give me a summary of my highest-priority leads and what I should do today." },
  { icon: Users, label: "Write a follow-up for a cold lead", prompt: "Write me a follow-up message for a lead who hasn't responded in 7 days." },
  { icon: AlertCircle, label: "Sales coaching tips", prompt: "What are the top 3 things I should do to improve my close rate this week?" },
  { icon: Lightbulb, label: "Suggest a re-engagement campaign", prompt: "Create a 3-message SMS re-engagement campaign for leads I haven't talked to in 30 days." },
  { icon: Sparkles, label: "Draft a quote follow-up", prompt: "Help me write a follow-up email for a $8,500 roofing proposal I sent 5 days ago." },
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: `Hi! I'm your LeadFlow AI Assistant. I can help you with:

**Lead Management**
• Summarize your hottest leads and prioritize your day
• Suggest follow-up messages personalized to each lead
• Identify patterns in your pipeline

**Sales Coaching**
• Review your conversion rates and identify improvement areas
• Craft compelling follow-up sequences
• Overcome objections with proven scripts

**Campaign Creation**
• Write email and SMS campaigns
• Build re-engagement sequences for cold leads
• Create appointment confirmation messages

What would you like help with today?`,
  timestamp: new Date(),
};

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, timestamp: new Date() },
        ]);
      } else {
        throw new Error("API error");
      }
    } catch {
      // Demo fallback
      const fallbacks: Record<string, string> = {
        default: `I understand you're asking about "${content}". Here's my advice:\n\n**Immediate Actions:**\n1. Contact your top 3 leads by phone within the next 2 hours\n2. Personalize your follow-up with their specific service needs\n3. Offer a free estimate or consultation to lower the barrier\n\n**For leads that haven't responded:**\nTry a pattern interrupt — instead of asking "Are you still interested?", try "I was putting together some pricing for your project and noticed we hadn't connected yet — did your timeline change?"\n\nWould you like me to write a specific message for any of your leads?`,
      };

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fallbacks.default,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">LeadFlow AI Assistant</p>
          <p className="text-xs text-gray-500">Powered by GPT-4 · Your personal sales coach</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600 font-medium">Active</span>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => sendMessage(p.prompt)}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all whitespace-nowrap flex-shrink-0"
          >
            <p.icon className="w-4 h-4 flex-shrink-0" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "assistant" ? "gradient-brand" : "bg-gray-200"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <span className="text-xs font-bold text-gray-600">You</span>
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-200"
              }`}
            >
              <p
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
              />
              <p className={`text-xs mt-2 ${msg.role === "user" ? "text-blue-200" : "text-gray-400"}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask about your leads, request follow-up copy, get sales tips..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="gradient-brand text-white p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
