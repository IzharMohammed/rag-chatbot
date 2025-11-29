"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { FileUploadZone } from "@/components/file-upload-zone";
import { EmptyState } from "@/components/empty-state";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, UploadedFile, ChatSession } from "@/types";

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Chat",
      createdAt: new Date(),
      messages: [],
      files: [],
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setUploadedFiles([]);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setUploadedFiles(session.files);
    }
  };

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files);

    // Create a new session if none exists
    if (!currentSessionId && files.length > 0) {
      const newSession: ChatSession = {
        id: Math.random().toString(36).substr(2, 9),
        name: files[0].name,
        createdAt: new Date(),
        messages: [],
        files: files,
      };
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } else if (currentSessionId) {
      // Update current session with new files
      setSessions(
        sessions.map((s) =>
          s.id === currentSessionId ? { ...s, files: files } : s
        )
      );
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Update session
    if (currentSessionId) {
      setSessions(
        sessions.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: updatedMessages,
                name:
                  s.messages.length === 0
                    ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                    : s.name,
              }
            : s
        )
      );
    }

    // Simulate AI response (you'll replace this with actual API call later)
    setIsTyping(true);
    setTimeout(() => {
      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: `This is a demo response. I can see you've uploaded **${
          uploadedFiles.length
        }** file${uploadedFiles.length !== 1 ? "s" : ""}. 

Once you integrate the RAG backend, I'll be able to answer questions about your documents!

Your question was: "${content}"`,
        timestamp: new Date(),
      };

      const newMessages = [...updatedMessages, aiMessage];
      setMessages(newMessages);
      setIsTyping(false);

      // Update session with AI response
      if (currentSessionId) {
        setSessions(
          sessions.map((s) =>
            s.id === currentSessionId ? { ...s, messages: newMessages } : s
          )
        );
      }
    }, 1500);
  };

  const hasFiles = uploadedFiles.length > 0;
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-background/95">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />

      <main className="flex flex-1 flex-col">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {!hasFiles && !hasMessages ? (
            <EmptyState />
          ) : (
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-4xl p-4">
                {/* File Upload Zone - Show only if no files uploaded */}
                {!hasFiles && (
                  <div className="mb-6">
                    <FileUploadZone
                      onFilesUploaded={handleFilesUploaded}
                      uploadedFiles={uploadedFiles}
                    />
                  </div>
                )}

                {/* Show uploaded files summary if files exist */}
                {hasFiles && !hasMessages && (
                  <div className="mb-6">
                    <FileUploadZone
                      onFilesUploaded={handleFilesUploaded}
                      uploadedFiles={uploadedFiles}
                    />
                  </div>
                )}

                {/* Chat Messages */}
                {hasMessages && (
                  <div className="space-y-0">
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {isTyping && (
                      <div className="bg-muted/30 p-4">
                        <div className="flex gap-4">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border">
                            <span className="text-xs text-foreground">AI</span>
                          </div>
                          <TypingIndicator />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Input - Show only if files are uploaded */}
        {hasFiles && (
          <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
        )}
      </main>
    </div>
  );
}
