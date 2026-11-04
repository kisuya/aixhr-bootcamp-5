"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CopyButtonProps = {
  code: string;
};

export function CopyButton({ code }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 1600);
    } catch {
      setCopied(false);
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      className="copy-button"
      aria-label={copied ? "코드 복사됨" : "코드 복사"}
      onClick={handleCopy}
    >
      <Icon aria-hidden="true" size={15} strokeWidth={2.2} />
      <span>{copied ? "복사됨" : "복사"}</span>
    </button>
  );
}
