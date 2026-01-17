"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

type ProjectGalleryProps = {
  images: string[];
  title: string;
};

function getAlt(title: string, index: number) {
  return `${title} ${index + 1}`;
}

export default function ProjectGallery({ images, title }: ProjectGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];
  const activeIndexValue = activeIndex ?? 0;
  const activeAlt = getAlt(title, activeIndexValue);
  const totalImages = images.length;
  const showNav = totalImages > 1;

  const goPrev = () => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }
      return (current - 1 + totalImages) % totalImages;
    });
  };

  const goNext = () => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }
      return (current + 1) % totalImages;
    });
  };

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, totalImages]);

  return (
    <div className="project-gallery">
      <div className="card-grid">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className="project-gallery-thumb"
            onClick={() => setActiveIndex(index)}
            aria-label={`Open image ${index + 1}`}
          >
            <div className="project-cover project-cover-gallery">
              <Image
                src={image}
                alt={getAlt(title, index)}
                width={800}
                height={500}
                sizes="(max-width: 768px) 100vw, 33vw"
                className="project-image"
                unoptimized={image.startsWith("data:")}
              />
            </div>
          </button>
        ))}
      </div>
      {portalTarget && activeImage
        ? createPortal(
            <div
              className="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={activeAlt}
            >
              <button
                className="lightbox-backdrop"
                type="button"
                aria-label="Close image"
                onClick={() => setActiveIndex(null)}
              />
              <div
                className="lightbox-content"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="button ghost lightbox-close"
                  type="button"
                  onClick={() => setActiveIndex(null)}
                >
                  Close
                </button>
                <div className="lightbox-image">
                  <Image
                    src={activeImage}
                    alt={activeAlt}
                    fill
                    sizes="(max-width: 900px) 90vw, 1000px"
                    className="project-image project-image-contain"
                    unoptimized={activeImage.startsWith("data:")}
                  />
                  {showNav ? (
                    <>
                      <button
                        className="button ghost lightbox-nav prev"
                        type="button"
                        onClick={goPrev}
                        aria-label="Previous image"
                      >
                        Prev
                      </button>
                      <button
                        className="button ghost lightbox-nav next"
                        type="button"
                        onClick={goNext}
                        aria-label="Next image"
                      >
                        Next
                      </button>
                    </>
                  ) : null}
                </div>
                {showNav ? (
                  <div className="lightbox-counter">
                    {activeIndexValue + 1} / {totalImages}
                  </div>
                ) : null}
              </div>
            </div>,
            portalTarget
          )
        : null}
    </div>
  );
}
