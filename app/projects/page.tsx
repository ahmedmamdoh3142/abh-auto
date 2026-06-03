/**
 * Projects page — /projects  (أعمالنا)
 * Path: app/projects/page.tsx
 *
 * Server component: owns metadata + zone background, delegates the
 * interactive archive to the client `ProjectsArchive`.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ProjectsArchive } from '@/components/sections/projects-archive';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects');
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function ProjectsPage() {
  return (
    <div className="bg-zone-cool">
      <ProjectsArchive />
    </div>
  );
}