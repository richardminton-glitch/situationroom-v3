'use client';

import { ParchmentScroll } from './ParchmentScroll';
import { DarkroomFilm } from './DarkroomFilm';
import type { StripBlock } from './types';
import type { Theme } from '@/types';

interface Props {
  blocks: StripBlock[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  keyFor: (b: StripBlock) => string;
  theme: Theme;
}

export function BlockStrip({ blocks, selectedKey, onSelect, keyFor, theme }: Props) {
  if (theme === 'parchment') {
    return <ParchmentScroll blocks={blocks} selectedKey={selectedKey} onSelect={onSelect} keyFor={keyFor} />;
  }
  return <DarkroomFilm blocks={blocks} selectedKey={selectedKey} onSelect={onSelect} keyFor={keyFor} />;
}
