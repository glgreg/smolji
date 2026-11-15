import type { Metadata } from 'next';
import PlaygroundClient from '../../components/PlaygroundClient';

export const metadata: Metadata = {
  title: 'Playground | Smolji',
  description:
    'Compose, tilt, and export multi-layer emoji PNG stickers across 11 styles right in your browser—no login required.',
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
