"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Bot, User, Copy, Check } from "lucide-react";
import { Message } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExpenseChart } from "./expense-chart";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group flex gap-4 p-4 ${isUser ? "" : "bg-muted/30"}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border">
        {isUser ? (
          <User className="h-4 w-4 text-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-foreground" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {isUser ? "You" : "DocuChat AI"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {format(message.timestamp, "h:mm a")}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Copied!" : "Copy message"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none prose-table:mt-2 prose-table:mb-2 prose-th:p-2 prose-td:p-2 prose-tr:border-b prose-tr:border-border">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {isUser ? (
              <p className="leading-relaxed">{message.content}</p>
            ) : (
              <div>
                {message.content
                  .split(/(<expense-chart>[\s\S]*?<\/expense-chart>)/)
                  .map((part, index) => {
                    if (part.startsWith("<expense-chart>")) {
                      try {
                        const jsonString = part
                          .replace("<expense-chart>", "")
                          .replace("</expense-chart>", "")
                          .trim();
                        const chartData = JSON.parse(jsonString);
                        return <ExpenseChart key={index} data={chartData} />;
                      } catch (e) {
                        console.error("Failed to parse chart data", e);
                        return null;
                      }
                    }
                    return (
                      <ReactMarkdown
                        key={index}
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="my-4 w-full overflow-hidden rounded-lg border border-border">
                              <Table {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <TableHeader {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <TableBody {...props} />
                          ),
                          tr: ({ node, ...props }) => <TableRow {...props} />,
                          th: ({ node, ...props }) => <TableHead {...props} />,
                          td: ({ node, ...props }) => <TableCell {...props} />,
                        }}
                      >
                        {part}
                      </ReactMarkdown>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
