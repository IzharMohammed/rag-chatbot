"use client";

import { useState } from "react";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, UploadedFile, TokenUsage, DetailedTokenUsage } from "@/types";
import FileUpload from "@/components/kokonutui/file-upload";
import { FileText, Sparkles, Upload, X } from "lucide-react";
import { getSessionId } from "@/lib/session"; // Session management

/**
 * Implementation plan
 * Stage 1: Indexing
 * 1. Load the document - pdf, text
 * 2. Chunk the document
 * 3. Generate vector embeddings
 * 4. Store in vector database
 *
 * Stage 2: Using the chatbot
 * 1. Setup LLM
 * 2. Add retrieval step
 * 3. Pass input + relevant information to LLM
 * 4. Congratulations
 */

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [showTokens, setShowTokens] = useState(false);
  const [detailedTokenUsage, setDetailedTokenUsage] =
    useState<DetailedTokenUsage>({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
    });

  const handleFilesUploaded = async (file: File) => {
    const newFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
    };

    setUploadedFiles([...uploadedFiles, newFile]);

    // Send PDF to backend for processing
    if (file.type === "application/pdf") {
      try {
        const sessionId = getSessionId(); // Get user's session ID
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionId); // Include session ID
        console.log("formData:-", formData);
        const response = await fetch("/api/upload-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        console.log("PDF processed:", data);
        // TODO: Store the document ID for later retrieval
      } catch (error) {
        console.error("Error uploading PDF:", error);
      }
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

    // Call the API endpoint
    setIsTyping(true);
    try {
      const sessionId = getSessionId(); // Get user's session ID
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: content, sessionId }), // Include session ID
      });

      if (!response.ok) {
        throw new Error("Failed to get response from API");
      }

      const data = await response.json();

      // Update token usage if available
      if (data.usage) {
        setTotalTokens((prev) => prev + data.usage.total_tokens);
        setDetailedTokenUsage((prev) => ({
          totalInputTokens: prev.totalInputTokens + data.usage.prompt_tokens,
          totalOutputTokens:
            prev.totalOutputTokens + data.usage.completion_tokens,
          totalTokens: prev.totalTokens + data.usage.total_tokens,
        }));
      }

      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      const newMessages = [...updatedMessages, aiMessage];
      setMessages(newMessages);
    } catch (error) {
      console.error("Error sending message:", error);

      // Show error message to user
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date(),
      };

      const newMessages = [...updatedMessages, errorMessage];
      setMessages(newMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Main Chat Area - Left Side */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-card/30 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            {/* <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-foreground">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-background" />
            </div> */}
            <div className="flex-1">
              <h1 className="text-base sm:text-lg font-bold">DocuChat AI</h1>
              <p className="text-xs text-muted-foreground">
                {uploadedFiles.length > 0
                  ? `${uploadedFiles.length} document${
                      uploadedFiles.length !== 1 ? "s" : ""
                    } uploaded`
                  : "Upload documents to start chatting"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {!hasMessages ? (
            <div className="flex h-full flex-col items-center justify-center p-4 sm:p-8 text-center">
              <div className="mb-6 sm:mb-8">
                <div className="relative mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border border-border bg-muted mx-auto">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-foreground" />
                </div>
                <h2 className="mb-3 text-2xl sm:text-3xl font-bold text-foreground">
                  Welcome to DocuChat AI
                </h2>
                <p className="max-w-md text-sm sm:text-base text-muted-foreground px-4">
                  Upload your documents using the panel on the right, then start
                  asking questions.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    icon: FileText,
                    title: "Upload Documents",
                    description: "PDF, DOCX, TXT supported",
                  },
                  {
                    icon: Sparkles,
                    title: "Ask Questions",
                    description: "Natural language queries",
                  },
                  {
                    icon: FileText,
                    title: "Get Answers",
                    description: "Instant AI responses",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
                  >
                    <feature.icon className="mb-3 h-8 w-8 text-foreground" />
                    <h3 className="mb-1 font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-3xl">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isTyping && (
                  <div className="bg-muted/30 p-4">
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                        <span className="text-xs text-foreground">AI</span>
                      </div>
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          tokenUsage={detailedTokenUsage}
        />
      </div>

      {/* Mobile Upload Button */}
      <button
        onClick={() => setIsUploadPanelOpen(true)}
        className="md:hidden fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:scale-105 transition-transform"
        aria-label="Open upload panel"
      >
        <Upload className="h-6 w-6" />
      </button>

      {/* Backdrop for mobile */}
      {isUploadPanelOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsUploadPanelOpen(false)}
        />
      )}

      {/* File Upload Panel - Right Side */}
      <div
        className={`
          fixed md:relative inset-y-0 right-0 z-50
          w-full sm:w-96 md:w-96
          border-l border-border bg-card/30 backdrop-blur-sm
          transform transition-transform duration-300 ease-in-out
          ${
            isUploadPanelOpen
              ? "translate-x-0"
              : "translate-x-full md:translate-x-0"
          }
        `}
      >
        <div className="flex h-full flex-col">
          {/* Upload Header */}
          <div className="border-b border-border px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Documents</h2>
                <p className="text-sm text-muted-foreground">
                  Upload your files to chat with them
                </p>
              </div>
              <button
                onClick={() => setIsUploadPanelOpen(false)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Close upload panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Upload Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <FileUpload onUploadSuccess={handleFilesUploaded} />

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3"
                  >
                    <FileText className="h-5 w-5 text-foreground" />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
