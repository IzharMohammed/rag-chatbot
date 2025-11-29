"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Plus, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatSession } from "@/types";

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

export function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            />

            {/* Sidebar Content */}
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 z-40 flex h-full w-80 flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl md:relative"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                  <Sparkles className="h-5 w-5 text-background" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">DocuChat AI</h1>
                  <p className="text-xs text-muted-foreground">
                    Document Intelligence
                  </p>
                </div>
              </div>

              <Separator />

              {/* New Chat Button */}
              <div className="p-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                </motion.div>
              </div>

              {/* Chat History */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-2 pb-4">
                  {sessions.length === 0 ? (
                    <div className="py-8 text-center">
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        No chats yet
                      </p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <motion.button
                        key={session.id}
                        whileHover={{ x: 4 }}
                        onClick={() => {
                          onSelectSession(session.id);
                          setIsOpen(false);
                        }}
                        className={`w-full rounded-lg p-3 text-left transition-colors ${
                          currentSessionId === session.id
                            ? "bg-muted text-foreground font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium">
                              {session.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {session.messages.length} messages
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="border-t border-border/50 p-4">
                <p className="text-center text-xs text-muted-foreground">
                  Built with ❤️ using Next.js
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
