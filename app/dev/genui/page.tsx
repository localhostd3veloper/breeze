import { notFound } from 'next/navigation';

import { GenUiFixtures } from './fixtures';

/**
 * Deterministic render harness for generative UI.
 *
 * Every widget and every failure mode as hand-written fences, so the renderer
 * can be proven without the model as a variable. Dev-only -- it never ships.
 */
export default function GenUiDevPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <GenUiFixtures />;
}
