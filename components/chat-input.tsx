"use client";

import { useState } from "react";
import { TokenUsageDisplay } from "@/components/token-usage-display";
import { DetailedTokenUsage } from "@/types";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  tokenUsage?: DetailedTokenUsage;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  tokenUsage,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const placeholders = [
    "Ask anything about your documents...",
    "What is the summary of the report?",
    "Find the financial data in the PDF...",
    "Who are the key stakeholders mentioned?",
    "Create a calendar event for the meeting...",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="border-t border-border/50 bg-background/95 px-3 py-4 sm:p-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex flex-col gap-2">
          <PlaceholdersAndVanishInput
            placeholders={placeholders}
            onChange={handleChange}
            onSubmit={handleSubmit}
            disabled={disabled}
            value={message}
          />

          {/* Token Usage Icon - Positioned absolutely or below */}
          {tokenUsage && tokenUsage.totalTokens > 0 && (
            <div className="absolute -bottom-6 right-0 scale-75 opacity-70 hover:opacity-100 transition-opacity">
              <TokenUsageDisplay usage={tokenUsage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
