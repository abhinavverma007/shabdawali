import HowToPlay from '../../../components/HowToPlay';
import { buildGuideMetadata } from '../../../lib/seo.mjs';

export const metadata = buildGuideMetadata('en');

export default function Page() {
  return <HowToPlay lang="en" />;
}
