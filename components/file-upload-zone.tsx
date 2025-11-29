"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { UploadedFile } from "@/types";

interface FileUploadZoneProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
}

export function FileUploadZone({
  onFilesUploaded,
  uploadedFiles,
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>(uploadedFiles);

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
    }));

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return FileText;
    return File;
  };

  return (
    <div className="space-y-4">
      <motion.div
        {...getRootProps()}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer ${
          isDragActive
            ? "border-purple-500 bg-purple-500/10"
            : "border-border/50 bg-card/30 hover:border-purple-500/50 hover:bg-card/50"
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />

        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex flex-col items-center justify-center text-center">
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className="mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 p-4"
          >
            <Upload className="h-8 w-8 text-white" />
          </motion.div>

          <h3 className="mb-2 text-lg font-semibold">
            {isDragActive ? "Drop your files here" : "Upload Documents"}
          </h3>

          <p className="mb-4 text-sm text-muted-foreground">
            Drag & drop or click to browse
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">PDF</Badge>
            <Badge variant="secondary">DOCX</Badge>
            <Badge variant="secondary">TXT</Badge>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Maximum file size: 10MB
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file) => {
              const Icon = getFileIcon(file.type);
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/30 p-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-2">
                      <Icon className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
