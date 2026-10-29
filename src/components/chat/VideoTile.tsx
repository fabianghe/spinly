"use client";

import { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}

export function VideoTile({ stream, muted, mirrored, className = "", label, children }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, [stream]);

  return (
    <div className={`overflow-hidden bg-plum-deep ${className || "relative"}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        aria-label={label}
        className={`h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""} ${stream ? "" : "invisible"}`}
      />
      {children}
    </div>
  );
}
