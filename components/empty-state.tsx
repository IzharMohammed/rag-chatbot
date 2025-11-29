"use client";

import { motion } from "framer-motion";
import { FileText, Sparkles, Zap } from "lucide-react";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex h-full flex-col items-center justify-center p-8 text-center"
    >
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600">
          <FileText className="h-12 w-12 text-white" />
        </div>
      </motion.div>

      <h2 className="mb-3 text-3xl font-bold">
        <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
          Welcome to DocuChat AI
        </span>
      </h2>

      <p className="mb-8 max-w-md text-muted-foreground">
        Upload your documents and start having intelligent conversations. Get
        instant answers to your questions with AI-powered insights.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            icon: Zap,
            title: "Get Answers",
            description: "Instant AI responses",
          },
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="group rounded-lg border border-border/40 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-purple-500/50 hover:bg-card/80"
          >
            <feature.icon className="mb-3 h-8 w-8 text-purple-500 transition-transform group-hover:scale-110" />
            <h3 className="mb-1 font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
