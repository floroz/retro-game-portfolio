import type { InspectionReading } from "../../config/inspections";

type ReadingPage = NonNullable<InspectionReading["pages"]>[number];
export interface FittedPage extends ReadingPage {
  fontSize: number;
  source: number;
  /** Character offset in the original page, for keeping one's place on resize. */
  offset: number;
}

type Block = { text: string; href?: string };
const readingPage = (title: string, blocks: Block[]): ReadingPage => ({
  title,
  paragraphs: blocks.filter((block) => !block.href).map((block) => block.text),
  links: blocks
    .filter((block) => block.href)
    .map((block) => ({ label: block.text, href: block.href! })),
});

/** Layout against real browser measurements, retaining every word and link. */
export function paginateInspection(
  pages: ReadingPage[],
  preferredSize: number,
  fits: (page: ReadingPage, fontSize: number) => boolean,
): FittedPage[] {
  const result: FittedPage[] = [];
  const minimumSize = 18;
  pages.forEach((page, source) => {
    let size = Math.max(minimumSize, Math.floor(preferredSize));
    while (size > minimumSize && !fits(page, size)) size--;
    if (fits(page, size)) {
      result.push({ ...page, fontSize: size, source, offset: 0 });
      return;
    }
    let blocks: Block[] = [];
    let offset = 0;
    let pageOffset = 0;
    const flush = () => {
      result.push({
        ...readingPage(page.title, blocks),
        fontSize: size,
        source,
        offset: pageOffset,
      });
      blocks = [];
      pageOffset = offset;
    };
    const input: Block[] = [
      ...page.paragraphs.map((text) => ({ text })),
      ...(page.links ?? []).map((link) => ({
        text: link.label,
        href: link.href,
      })),
    ];
    for (const block of input) {
      let remaining = block.text;
      while (remaining) {
        if (
          fits(
            readingPage(page.title, [...blocks, { ...block, text: remaining }]),
            size,
          )
        ) {
          blocks.push({ ...block, text: remaining });
          offset += remaining.length;
          break;
        }
        // Prefer whole paragraphs and links on a fresh page.
        if (blocks.length) {
          flush();
          continue;
        }
        const words = remaining.match(/\s*\S+\s*/g) ?? [remaining];
        let low = 0;
        let high = words.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          const candidate = words.slice(0, mid).join("");
          if (
            fits(readingPage(page.title, [{ ...block, text: candidate }]), size)
          )
            low = mid;
          else high = mid - 1;
        }
        let chunk = words.slice(0, low).join("");
        // Very long unbroken identifiers/URLs can span more than one page.
        if (!chunk) {
          let end = 1;
          while (
            end < words[0].length &&
            fits(
              readingPage(page.title, [
                { ...block, text: words[0].slice(0, end + 1) },
              ]),
              size,
            )
          )
            end++;
          chunk = words[0].slice(0, end);
        }
        blocks.push({ ...block, text: chunk });
        offset += chunk.length;
        remaining = remaining.slice(chunk.length);
        flush();
      }
    }
    if (blocks.length) flush();
  });
  return result;
}
