"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import type { TutorMessage, TutorContext } from "@/types";

interface AITutorProps {
  context: TutorContext;
}

export function AITutor({ context }: AITutorProps) {
  const {
    tutorMessages,
    addTutorMessage,
    updateLastTutorMessage,
    clearTutorMessages,
    lang,
  } = useExperimentStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tutorMessages]);

  // Show greeting on mount
  useEffect(() => {
    if (tutorMessages.length === 0) {
      const greeting = lang === "si"
        ? "ආයුබෝවන්! මමA/L රසායන විද්‍යා ගුරු සහකාරයා. ඔබට මෙම අත්හදා බැලීමේ මාර්ගෝපදේශය ලබා දීමට සිටිමි. ප්‍රශ්නයක් ඇත්නම් අසන්න!"
        : lang === "ta"
        ? "வணக்கம்! நான் உங்கள் A/L வேதியியல் ஆய்வக உதவியாளர். இந்த சோதனையில் உங்களுக்கு வழிகாட்ட இங்கே இருக்கிறேன். கேள்விகள் கேளுங்கள்!"
        : "Hello! I'm your A/L Chemistry lab assistant. I'm here to guide you through this experiment. What would you like to know?";

      addTutorMessage({
        id: "greeting",
        role: "assistant",
        content: greeting,
        timestamp: new Date(),
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: TutorMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    addTutorMessage(userMessage);
    setInput("");
    setIsLoading(true);
    setError(null);

    // Add placeholder assistant message
    const assistantId = (Date.now() + 1).toString();
    addTutorMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    });

    try {
      const conversationHistory = tutorMessages
        .filter((m) => m.role !== "assistant" || !m.isStreaming)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          experimentTitle: context.experimentTitle,
          unit: context.unit,
          mode: context.mode,
          currentStep: context.currentStep,
          selectedItem: context.selectedItem,
          observations: context.observations,
          language: lang,
          conversationHistory,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Tutor unavailable");
      }

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                updateLastTutorMessage(accumulated);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      updateLastTutorMessage("Sorry, I'm having trouble responding right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, tutorMessages, addTutorMessage, updateLastTutorMessage, context, lang]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const placeholder = lang === "si"
    ? "මෙම අත්හදා බැලීම ගැන අසන්න..."
    : lang === "ta"
    ? "இந்த சோதனை பற்றி கேளுங்கள்..."
    : "Ask about this experiment...";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-teal/20 border border-teal/40 flex items-center justify-center">
            <span className="text-teal text-xs">AI</span>
          </div>
          <span className="font-orbitron text-xs tracking-wider text-white">
            {lang === "si" ? "AI ගුරුවරයා" : lang === "ta" ? "AI ஆசிரியர்" : "AI TUTOR"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {context.mode === "Exam" && (
            <span className="text-red-400 text-xs font-rajdhani border border-red-700/50 px-2 py-0.5 rounded">
              EXAM MODE
            </span>
          )}
          <button
            onClick={clearTutorMessages}
            className="text-slate-500 hover:text-slate-300 text-xs font-rajdhani transition-colors"
            title="Clear conversation"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <AnimatePresence initial={false}>
          {tutorMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-5 h-5 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <span className="text-teal text-xs leading-none">AI</span>
                </div>
              )}
              <div
                className={`
                  max-w-[85%] px-3 py-2.5 rounded-lg text-sm font-rajdhani leading-relaxed
                  ${msg.role === "user"
                    ? "chat-message-user"
                    : "chat-message-assistant"
                  }
                  ${msg.isStreaming && !msg.content ? "shimmer" : ""}
                `}
              >
                {msg.content || (msg.isStreaming ? "" : "...")}
                {msg.isStreaming && msg.content && (
                  <span className="inline-block w-0.5 h-4 bg-teal animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2">
          <p className="text-red-400 text-xs font-rajdhani">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={2}
            className="
              flex-1 bg-bench border border-border rounded px-3 py-2
              text-white text-sm font-rajdhani placeholder-slate-600
              resize-none outline-none
              focus:border-teal focus:ring-1 focus:ring-teal/30
              disabled:opacity-50 transition-colors
            "
          />
          <motion.button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            whileTap={{ scale: 0.95 }}
            className="
              px-3 bg-teal hover:bg-teal-light disabled:opacity-40
              text-white rounded text-sm font-rajdhani font-semibold
              transition-colors flex items-center gap-1 self-end pb-2
            "
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{lang === "si" ? "යවන්න" : lang === "ta" ? "அனுப்பு" : "Send"}</span>
            )}
          </motion.button>
        </div>
        <p className="text-slate-600 text-xs font-rajdhani mt-1.5">
          {lang === "si" ? "Enter ↵ නිමිත්ත යවන්න" : lang === "ta" ? "Enter ↵ அனுப்ப" : "Enter ↵ to send · Shift+Enter for newline"}
        </p>
      </div>
    </div>
  );
}
