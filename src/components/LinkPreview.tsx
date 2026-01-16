"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeUrl } from "@/lib/url";

type LinkPreviewProps = {
  url: string;
  label: string;
  title?: string;
  openLabel: string;
  closeLabel: string;
};

export default function LinkPreview({
  url,
  label,
  title = "Preview",
  openLabel,
  closeLabel
}: LinkPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    return null;
  }

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="button ghost"
        onClick={() => setIsOpen(true)}
      >
        {label}
      </button>
      {portalTarget && isOpen
        ? createPortal(
            <div className="lightbox" role="dialog" aria-modal="true" aria-label={title}>
              <button
                className="lightbox-backdrop"
                type="button"
                aria-label={closeLabel}
                onClick={() => setIsOpen(false)}
              />
              <div
                className="lightbox-content link-preview-content"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="link-preview-header">
                  <strong>{title}</strong>
                  <div className="link-preview-actions">
                    <a
                      className="button ghost"
                      href={normalizedUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {openLabel}
                    </a>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => setIsOpen(false)}
                    >
                      {closeLabel}
                    </button>
                  </div>
                </div>
                <div className="link-preview-frame">
                  <iframe
                    src={normalizedUrl}
                    title={title}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>,
            portalTarget
          )
        : null}
    </>
  );
}
