import { describe, expect, it } from 'vitest';

import {
  getKitLinkedBookCount,
  getVisiblePrimaryCollectionAssets,
  normalizeSingleKitBookIds,
  shouldShowKitLinkedBooksPanel,
} from './collectionPresentation';

describe('normalizeSingleKitBookIds', () => {
  it('keeps only the first non-empty unique linked book id', () => {
    expect(normalizeSingleKitBookIds([' first-book ', 'second-book', 'first-book'])).toEqual(['first-book']);
  });

  it('returns an empty array when the input is empty or invalid', () => {
    expect(normalizeSingleKitBookIds(['', '   '])).toEqual([]);
    expect(normalizeSingleKitBookIds(undefined)).toEqual([]);
  });
});

describe('kit linked book presentation', () => {
  it('uses the configured ids while linked books are loading', () => {
    expect(getKitLinkedBookCount({
      linkedBookIdsCount: 3,
      linkedBooksCount: 0,
      loadingLinkedBooks: true,
    })).toBe(3);
  });

  it('uses the resolved linked books after loading finishes', () => {
    expect(getKitLinkedBookCount({
      linkedBookIdsCount: 3,
      linkedBooksCount: 1,
      loadingLinkedBooks: false,
    })).toBe(1);
  });

  it('keeps a single linked book embedded in the kit experience', () => {
    expect(shouldShowKitLinkedBooksPanel(1)).toBe(false);
  });

  it('shows the book chooser only when the kit has multiple linked books', () => {
    expect(shouldShowKitLinkedBooksPanel(2)).toBe(true);
  });

  it('keeps the reading shortcut in the kit when the linked books panel stays hidden', () => {
    expect(getVisiblePrimaryCollectionAssets([
      { id: 'reading', category: 'reading', media_type: 'document', title: 'Leitura', url: '/reading.pdf', scope: 'primary' },
      { id: 'audio', category: 'storytelling', media_type: 'audio', title: 'Contação', url: '/audio.mp3', scope: 'primary' },
    ], false).map((asset) => asset.category)).toEqual(['reading', 'storytelling']);
  });

  it('removes the reading shortcut when the kit exposes the linked books panel', () => {
    expect(getVisiblePrimaryCollectionAssets([
      { id: 'reading', category: 'reading', media_type: 'document', title: 'Leitura', url: '/reading.pdf', scope: 'primary' },
      { id: 'video', category: 'animation', media_type: 'video', title: 'Animado', url: '/video.mp4', scope: 'primary' },
    ], true).map((asset) => asset.category)).toEqual(['animation']);
  });
});