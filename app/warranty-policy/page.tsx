/**
 * Path: app/warranty-policy/page.tsx
 * الرابط: /warranty-policy (اللغة بتتحدد من next-intl عبر كوكي/هيدر،
 * مفيش [locale] في الراوتنج زي باقي صفحات الموقع).
 *
 * صفحة رفيعة بتستدعي الـview فقط — نفس نمط بقية صفحات الموقع
 * (شوف كيف account/page.tsx بيستدعي AccountView).
 */
import { WarrantyPolicyView } from '@/components/sections/warranty/warranty-policy-view';

export const metadata = {
  title: 'سياسة وشروط الضمان | ABH AUTO',
  description: 'تفاصيل ضمان ABH AUTO: مدد التغطية لكل خدمة، ما يشمله الضمان وما لا يشمله، وخطوات المطالبة.',
};

export default function WarrantyPolicyPage() {
  return <WarrantyPolicyView />;
}