"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DetailedTokenUsage } from "@/types";

interface TokenUsageDisplayProps {
  usage: DetailedTokenUsage;
}

export function TokenUsageDisplay({ usage }: TokenUsageDisplayProps) {
  const { totalInputTokens, totalOutputTokens, totalTokens } = usage;

  // Calculate percentage (assuming a typical context window, you can adjust this)
  const maxTokens = 8192;
  const percentage = ((totalTokens / maxTokens) * 100).toFixed(1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
          aria-label="Token usage"
        >
          <Info className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end" side="top">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{percentage}%</span>
            <span className="text-sm text-muted-foreground">
              {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()}{" "}
              tokens
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
            />
          </div>

          {/* Token Breakdown */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Input</span>
              <span className="font-mono">
                {totalInputTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Output</span>
              <span className="font-mono">
                {totalOutputTokens.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-medium">
              <span>Total tokens</span>
              <span className="font-mono">{totalTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
