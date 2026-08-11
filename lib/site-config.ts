/**
 * Site configuration — central source of brand truth.
 *
 * All image URLs use Unsplash CDN with their `photo-NNN-HASH` source IDs,
 * which are stable indefinitely.
 */
export const siteConfig = {
  name: 'ABH Auto',
  shortName: 'ABH',
  tagline: 'Premium Automotive Protection',
  url: 'https://abh-auto.com',
  description:
    'ABH Auto — a specialized workshop for automotive protection. Nano-ceramic, paint protection film, armored security, smart tracking and bespoke detailing for the world\'s finest vehicles.',
  ogImage: '/images/og.jpg',
  links: {
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
    linkedin: 'https://linkedin.com',
    whatsapp: 'https://wa.me/+966570888803',
  },
  contact: {
    phone: '+966570888803',
    email: 'concierge@abh-auto.example',
    address: 'شارع الأمير محمد بن عبد العزيز',
  },
} as const;

export const navLinks = [
  { key: 'home', href: '/' },
  { key: 'services', href: '/services' },
  { key: 'projects', href: '/projects' },
  { key: 'about', href: '/about' },
  { key: 'offers', href: '/offers' },
  { key: 'contact', href: '/contact' },
  { key: 'warranty', href: '/warranty-policy' },
  { key: 'booking', href: '/booking' },
] as const;

/**
 * Hero video — cinematic luxury car from Pixabay's free CDN.
 * Multiple sources for browser compatibility.
 */
export const heroVideoSources = [
  {
    src: 'https://cdn.pixabay.com/video/2024/04/13/207679_large.mp4',
    type: 'video/mp4',
  },
  {
    src: 'https://cdn.pixabay.com/video/2023/10/18/185872-876973812_large.mp4',
    type: 'video/mp4',
  },
] as const;

/**
 * Hero poster — verified stable Unsplash photo ID.
 * Cinematic dark-mode luxury vehicle (Lamborghini) with
 * rim-lighting and deep blacks — perfect for full-bleed hero.
 */
export const heroPoster =
  'https://images.unsplash.com/photo-1617531653522-221bcf9b6227?auto=format&fit=crop&w=2400&q=90';

export const serviceImages: Record<string, string> = {
  ceramic:
    '/images/service-ceramic.webp',
  ppf:
    '/images/service-ppf.webp',
  armor:
    '/images/service-detailing.webp',
  tracking:
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=75',
  security:
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=75',
  detailing:
    '/images/service-detailing.webp',
};

export const offerImages = [
  '/images/offer-1.webp',
  '/images/offer-2.webp',
  '/images/offer-3.webp',
];

/**
 * Why-choose-us images — 5 stops along the workshop story.
 * 1: workshop interior / detailing
 * 2: ceramic film / coating closeup
 * 3: clean indoor workshop interior
 * 4: technician documenting / inspecting
 * 5: luxury car delivery
 */
export const whyImages = [
  '/images/why-1.webp',
  '/images/why-2.webp',
  '/images/why-3.webp',
  '/images/why-4.webp',
  '/images/why-5.webp',
];

export const projectImages = [
  '/images/project-1.webp',
  '/images/project-2.webp',
  '/images/project-3.webp',
  '/images/project-4.webp',
  '/images/project-5.webp',
  '/images/project-6.webp',
  '/images/project-7.webp',
  '/images/project-8.webp',
];

export const stats = [
  { key: 'cars', value: 12480, suffix: '+' },
  { key: 'clients', value: 3890, suffix: '+' },
  { key: 'cities', value: 42, suffix: '' },
  { key: 'years', value: 18, suffix: '' },
];

export const testimonials = [
  {
    name: 'Khalid Al Mansouri',
    role: 'Private Collector',
    rating: 5,
    quote:
      'They treated my 250 GTO with the reverence of curators. Every panel inspected, every decision documented. I trust no one else.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=75',
  },
  {
    name: 'Alessandra Romano',
    role: 'CEO, Romano Holdings',
    rating: 5,
    quote:
      'The workshop in Milan is run with the precision of a Swiss workshop and the discretion of a private bank. Unparalleled.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75',
  },
  {
    name: 'Hisham Al Sayed',
    role: 'Founder, AS Capital',
    rating: 5,
    quote:
      'After eight years of partnership, my entire stable is in their care. The  knows each car by name and history.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=75',
  },
  {
    name: 'Yuki Tanaka',
    role: 'Industrial Designer',
    rating: 5,
    quote:
      'I have worked with master craftsmen in Kyoto. The work I have seen here is at that level. The standard is exceptional.',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=75',
  },
  {
    name: 'Reem Al Otaibi',
    role: 'Private Aviation',
    rating: 5,
    quote:
      'They protected our entire fleet — including the Phantom and the Cullinan — without a single complaint in three years.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=75',
  },
];