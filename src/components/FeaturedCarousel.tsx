"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale, SiteCopy } from "@/lib/content";
import type { PortfolioItem } from "@/lib/portfolio";
import ProjectCard from "@/components/ProjectCard";

type FeaturedCarouselProps = {
  items: PortfolioItem[];
  locale: Locale;
  labels: SiteCopy["labels"];
};

export default function FeaturedCarousel({
  items,
  locale,
  labels
}: FeaturedCarouselProps) {
  const total = items.length;
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    if (startIndex >= total) {
      setStartIndex(0);
    }
  }, [startIndex, total]);

  if (total === 0) {
    return null;
  }

  const getIndex = (offset: number) =>
    (startIndex + offset + total) % total;

  const visibleCount = Math.min(3, total);
  const visibleIndices = useMemo(
    () => Array.from({ length: visibleCount }, (_, i) => getIndex(i)),
    [startIndex, total, visibleCount]
  );
  const centerIndex =
    visibleIndices[Math.min(1, visibleIndices.length - 1)];
  const firstIndex = visibleIndices[0];
  const lastIndex = visibleIndices[visibleIndices.length - 1];

  const handlePrev = () => {
    if (total <= 1) {
      return;
    }
    setStartIndex((current) => (current - 1 + total) % total);
  };

  const handleNext = () => {
    if (total <= 1) {
      return;
    }
    setStartIndex((current) => (current + 1) % total);
  };

  return (
    <div className="featured-carousel">
      <div className="carousel-track">
        {visibleIndices.map((index) => {
          const item = items[index];
          const isActive = index === centerIndex;
          const isPrev = index === firstIndex && !isActive;
          const isNext = index === lastIndex && !isActive && !isPrev;
          const positionClass = isActive
            ? "is-active"
            : isPrev
              ? "is-prev"
              : isNext
                ? "is-next"
                : "is-side";
          return (
            <div className={`carousel-item ${positionClass}`} key={item.id}>
              <ProjectCard item={item} locale={locale} labels={labels} />
            </div>
          );
        })}
      </div>
      <div className="carousel-controls">
        <button
          type="button"
          className="button ghost carousel-btn"
          onClick={handlePrev}
          disabled={total <= 1}
          aria-label="Previous project"
        >
          Prev
        </button>
        <button
          type="button"
          className="button ghost carousel-btn"
          onClick={handleNext}
          disabled={total <= 1}
          aria-label="Next project"
        >
          Next
        </button>
      </div>
    </div>
  );
}
