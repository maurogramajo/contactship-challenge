"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── SpeechRecognition type shim ──────────────────────────────────────

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
};
type SpeechRecognitionErrorEventLike = { error?: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ── Props ────────────────────────────────────────────────────────────

interface VoiceTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  lang?: string;
}

// ── Component ────────────────────────────────────────────────────────

export function VoiceTextarea({
  id,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
  disabled = false,
  className = "",
  lang = "es-AR",
}: VoiceTextareaProps) {
  const [isListening, setIsListening] = useState(false);
  const [supportsMic, setSupportsMic] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseValueRef = useRef("");
  const finalTextRef = useRef("");

  useEffect(() => {
    setSupportsMic(getSpeechRecognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (disabled || isListening) return;
    if (isListening) { stopListening(); return; }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      baseValueRef.current = value.trim();
      finalTextRef.current = "";
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const t = result[0]?.transcript?.trim() ?? "";
          if (!t) continue;
          if (result.isFinal) {
            finalTextRef.current = `${finalTextRef.current} ${t}`.trim();
          } else {
            interimText = `${interimText} ${t}`.trim();
          }
        }
        const fullText = [baseValueRef.current, finalTextRef.current, interimText]
          .map((p) => p.trim())
          .filter(Boolean)
          .join(" ")
          .trim();
        onChange(fullText);
      };

      recognition.onerror = (event) => {
        if (event.error && !["aborted", "no-speech"].includes(event.error)) {
          console.warn("[VoiceTextarea] Speech recognition error:", event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [disabled, isListening, lang, onChange, stopListening, value]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <div className={`relative ${className}`}>
      <textarea
        id={id}
        ref={textareaRef}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 pr-12 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y disabled:opacity-50"
      />
      {supportsMic && (
        <button
          type="button"
          disabled={disabled}
          aria-label={isListening ? "Detener dictado" : "Dictar texto"}
          aria-pressed={isListening}
          onClick={toggleListening}
          className={`absolute right-2 top-2 grid size-8 shrink-0 place-items-center rounded-full transition-[background-color,box-shadow,color,transform] duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35 ${
            isListening
              ? "bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.24)] animate-pulse"
              : "bg-surface text-text-tertiary hover:bg-primary-light hover:text-primary"
          }`}
        >
          {/* Mic icon */}
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
      )}
    </div>
  );
}
