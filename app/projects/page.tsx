/**
 * Projects page — /projects  (أعمالنا)
 */
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import { ProjectsArchive } from '@/components/sections/projects-archive';
import { getProjectsData } from '@/lib/projects-data';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { text } = await getProjectsData(locale as 'en' | 'ar');
  return {
    title: text?.meta?.title ?? 'Projects',
    description: text?.subtitle ?? '',
  };
}

export default async function ProjectsPage() {
  const locale = await getLocale();
  const { projects, text } = await getProjectsData(locale as 'en' | 'ar');

  return (
    <div className="bg-zone-cool">
      <ProjectsArchive projects={projects as any} txt={text} />
    </div>
  );
}