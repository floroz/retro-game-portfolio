import { useLayoutEffect, useState, type RefObject } from "react";
import type { InspectionReading } from "../../config/inspections";
import { paginateInspection, type FittedPage } from "./inspectionPagination";
import styles from "./ObjectInspectionView.module.scss";

/** Reflow after fonts load and whenever the actual card's available space changes. */
export function useInspectionPagination(
  inspection: InspectionReading,
  copy: RefObject<HTMLDivElement | null>,
) {
  const [layout, setLayout] = useState<{
    pages: FittedPage[];
    index: number;
    ready: boolean;
  }>({ pages: [], index: 0, ready: false });

  useLayoutEffect(() => {
    const box = copy.current;
    if (!box) return;
    let cancelled = false;
    let fontsReady = false;
    const source = inspection.pages?.length
      ? inspection.pages
      : [{ title: inspection.title, paragraphs: inspection.paragraphs }];
    const fit = () => {
      if (cancelled || !fontsReady || !box.clientWidth || !box.clientHeight)
        return;
      const css = getComputedStyle(box);
      // clientWidth and clientHeight round to whole pixels, and half a pixel
      // is enough to wrap a line differently. Computed sizes keep the fraction.
      const outer = css.boxSizing === "border-box";
      const inner = (size: string, ...edges: string[]) =>
        parseFloat(size) -
        (outer ? edges.reduce((sum, edge) => sum + parseFloat(edge), 0) : 0);
      const width = inner(
        css.width,
        css.paddingLeft,
        css.paddingRight,
        css.borderLeftWidth,
        css.borderRightWidth,
      );
      const height = inner(
        css.height,
        css.paddingTop,
        css.paddingBottom,
        css.borderTopWidth,
        css.borderBottomWidth,
      );
      const probe = document.createElement("div");
      probe.className = styles.page;
      probe.setAttribute("aria-hidden", "true");
      probe.inert = true;
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: `${width}px`,
        top: "0",
        left: "0",
      });
      box.append(probe);
      const append = (tag: string, text: string, className?: string) => {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        probe.append(element);
        return element;
      };
      const pages = paginateInspection(
        source,
        parseFloat(css.fontSize),
        (page, size) => {
          probe.replaceChildren();
          probe.style.fontSize = `${size}px`;
          if (inspection.subtitle)
            append("p", inspection.subtitle, styles.subtitle);
          append("h2", inspection.title);
          if (page.title !== inspection.title) append("h3", page.title);
          page.paragraphs.forEach((text) => append("p", text));
          if (page.links?.length) {
            const list = append("ul", "", styles.links);
            page.links.forEach((link) => {
              const item = document.createElement("li");
              const anchor = document.createElement("a");
              anchor.textContent = link.label;
              anchor.href = link.href;
              item.append(anchor);
              list.append(item);
            });
          }
          // A small guard accommodates fractional layout and font rounding.
          return (
            probe.offsetHeight <= height - 2 && probe.scrollWidth <= width + 1
          );
        },
      );
      probe.remove();
      setLayout((old) => {
        const previous = old.pages[old.index];
        let index = 0;
        if (previous)
          pages.forEach((page, i) => {
            if (
              page.source === previous.source &&
              page.offset <= previous.offset
            )
              index = i;
          });
        return { pages, index, ready: true };
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    // Explicit requests also cover a card opened before @font-face was used.
    void Promise.allSettled([
      document.fonts.load('24px "Adventure Reading"'),
      document.fonts.load('36px "Adventure Display"'),
    ]).then(() => {
      fontsReady = true;
      fit();
    });
    document.fonts.addEventListener("loadingdone", fit);
    return () => {
      cancelled = true;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", fit);
    };
  }, [inspection, copy]);

  return {
    ...layout,
    turnPage: (next: number) =>
      setLayout((old) => ({
        ...old,
        index: Math.max(0, Math.min(old.pages.length - 1, next)),
      })),
  };
}
