import { useEffect, useState } from 'react';
import { useApp } from '../app/AppProvider';
import { Card } from '../cards/types';
import { renderPages } from '../images/pdf';
import { dataUri } from './useCardImage';

export interface PdfPage {
  uri: string;
  aspect: number;
}

// The card's stored PDF (base64), or null while loading and for a photo card.
export function useCardPdf(card: Card | undefined | null): string | null {
  const { services } = useApp();
  const key = card?.pdf ? `${card.id}:${card.updatedAt}` : null;
  const [pdf, setPdf] = useState<string | null>(null);

  useEffect(() => {
    setPdf(null);
    if (!key || !card) return;
    let live = true;
    services.store
      .loadPdf(card.id)
      .then((b64) => live && setPdf(b64))
      .catch((e) => console.warn('Loading the PDF failed', e));
    return () => {
      live = false;
    };
    // card is fully described by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, services]);

  return pdf;
}

// Every page of a PDF, drawn one after another. Pages not drawn yet are null, so a list can hold
// their places from the start.
export function usePdfPages(pdfBase64: string | null, pageCount: number, maxEdge: number): (PdfPage | null)[] {
  const [pages, setPages] = useState<(PdfPage | null)[]>([]);

  useEffect(() => {
    setPages(Array.from({ length: pdfBase64 ? pageCount : 0 }, () => null));
    if (!pdfBase64) return;
    let cancelled = false;
    renderPages(
      { pdfBase64, pageCount },
      maxEdge,
      (index, image) =>
        setPages((current) => {
          const next = [...current];
          next[index] = { uri: dataUri(image.jpegBase64), aspect: image.aspect };
          return next;
        }),
      () => cancelled,
    ).catch((e) => console.warn('Drawing the PDF pages failed', e));
    return () => {
      cancelled = true;
    };
  }, [pdfBase64, pageCount, maxEdge]);

  return pages;
}
