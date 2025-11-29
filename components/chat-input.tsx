"use client";

import { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border/50 bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-4xl">
        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents..."
              disabled={disabled}
              rows={1}
              className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-input bg-card/50 px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                height: "auto",
                overflowY: message.split("\n").length > 3 ? "auto" : "hidden",
              }}
            />
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              size="icon"
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>{" "}
          to send,{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">
            Shift + Enter
          </kbd>{" "}
          for new line
        </p>
      </div>
    </div>
  );
}
