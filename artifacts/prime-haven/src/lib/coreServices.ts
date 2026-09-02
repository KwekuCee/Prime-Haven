import {
  Palette,
  Layers,
  Globe,
  Smartphone,
  Clapperboard,
  Film,
  Megaphone,
  Cpu,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single source of truth for Prime Haven's core service offering.
 * Used by the homepage services section, service detail pages,
 * the talent registration role picker, and the sitemap.
 */
export interface CoreService {
  /** URL slug used for /services/:slug and the sitemap. */
  slug: string;
  /** Public-facing service name. */
  title: string;
  /** Value stored on the talent profile as `professional_title`. Existing values are preserved. */
  roleValue: string;
  /** Human-readable role label shown in the registration dropdown. */
  roleLabel: string;
  icon: LucideIcon;
  description: string;
  longDescription: string;
  features: string[];
  process: string[];
  image: string;
}

export const CORE_SERVICES: CoreService[] = [
  {
    slug: 'graphic-design',
    title: 'Graphic Design',
    roleValue: 'graphic-designer',
    roleLabel: 'Graphic Designer',
    icon: Palette,
    description: 'Eye-catching visual content that captivates audiences and elevates your brand identity.',
    longDescription:
      'Our graphic design team creates stunning visuals that communicate your brand message effectively. From logos to marketing materials, we deliver designs that captivate and convert.',
    features: [
      'Logo & Brand Identity Design',
      'Marketing Materials (Brochures, Flyers)',
      'Social Media Graphics',
      'Packaging Design',
      'Print & Digital Advertisements',
    ],
    process: ['Discovery & Research', 'Concept Development', 'Design Creation', 'Revisions & Refinement', 'Final Delivery'],
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=600&fit=crop',
  },
  {
    slug: 'ui-ux-design',
    title: 'UI/UX Design',
    roleValue: 'ui-ux-designer',
    roleLabel: 'UI/UX Designer',
    icon: Layers,
    description: 'Intuitive interfaces and seamless user experiences that delight and engage users.',
    longDescription:
      'We craft intuitive user interfaces and engaging user experiences that keep users coming back. Our designs are not just beautiful but functional and user-friendly.',
    features: ['User Research & Personas', 'Wireframing & Prototyping', 'UI Design Systems', 'Usability Testing', 'Mobile & Responsive Design'],
    process: ['User Research', 'Information Architecture', 'Wireframing', 'UI Design', 'Prototyping & Testing'],
    image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1200&h=600&fit=crop',
  },
  {
    slug: 'web-development',
    title: 'Web Development',
    roleValue: 'web-developer',
    roleLabel: 'Web Developer',
    icon: Globe,
    description: 'High-performance websites and web applications built with cutting-edge technologies.',
    longDescription:
      'We build high-performance websites and web applications using cutting-edge technologies. From simple landing pages to complex web platforms, we deliver robust solutions.',
    features: ['Custom Website Development', 'E-commerce Solutions', 'Web Applications', 'API Integration', 'Performance Optimization'],
    process: ['Planning & Analysis', 'Design & Prototyping', 'Development', 'Testing & Quality Assurance', 'Deployment & Maintenance'],
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop',
  },
  {
    slug: 'mobile-app-development',
    title: 'Mobile App Development',
    roleValue: 'mobile-app-developer',
    roleLabel: 'Mobile App Developer',
    icon: Smartphone,
    description: 'Native and cross-platform mobile apps for iOS and Android that users love to open.',
    longDescription:
      'From idea to App Store, we design and build mobile applications that feel fast, look polished, and scale with your business. We work with React Native, Flutter, and native toolchains.',
    features: ['iOS & Android Apps', 'Cross-Platform (React Native, Flutter)', 'App Store & Play Store Publishing', 'Push Notifications & Offline Support', 'Backend & API Integration'],
    process: ['Product Discovery', 'UX Flows & Prototyping', 'Development & QA', 'Beta Testing', 'Launch & Iteration'],
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=600&fit=crop',
  },
  {
    slug: 'motion-graphics',
    title: 'Motion Graphics',
    roleValue: 'motion-graphics-designer',
    roleLabel: 'Motion Graphics Designer',
    icon: Clapperboard,
    description: 'Animated visuals, explainers, and brand motion that bring your story to life.',
    longDescription:
      'Motion turns attention into understanding. We produce animated logos, product explainers, kinetic typography, and social-ready motion pieces that make complex ideas simple and memorable.',
    features: ['Animated Logos & Idents', 'Explainer Videos', 'Kinetic Typography', 'Social Media Motion Assets', 'Lottie & Web Animations'],
    process: ['Script & Storyboard', 'Style Frames', 'Animation', 'Sound Design', 'Delivery in All Formats'],
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&h=600&fit=crop',
  },
  {
    slug: 'video-editing',
    title: 'Video Editing',
    roleValue: 'video-editor',
    roleLabel: 'Video Editor',
    icon: Film,
    description: 'Cinematic cuts, colour grading, and sound that turn raw footage into content people finish.',
    longDescription:
      'Whether it is a brand film, YouTube series, event recap, or a batch of short-form reels, our editors shape footage into tight, engaging stories with professional colour, sound, and pacing.',
    features: ['Short-Form Reels & TikToks', 'YouTube & Long-Form Editing', 'Colour Grading', 'Sound Mixing & Captions', 'Corporate & Event Videos'],
    process: ['Footage Review', 'Rough Cut', 'Fine Cut & Grading', 'Sound & Captions', 'Final Export'],
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&h=600&fit=crop',
  },
  {
    slug: 'social-media-management',
    title: 'Social Media Management',
    roleValue: 'social-media-manager',
    roleLabel: 'Social Media Manager',
    icon: Megaphone,
    description: 'Strategy, content, and community management that grows your audience consistently.',
    longDescription:
      'We run your social presence end to end: content calendars, on-brand creatives, copywriting, scheduling, community replies, and monthly analytics so you always know what is working.',
    features: ['Content Strategy & Calendars', 'Post Design & Copywriting', 'Scheduling & Publishing', 'Community Management', 'Monthly Analytics Reports'],
    process: ['Audit & Strategy', 'Content Planning', 'Creation & Approval', 'Publishing & Engagement', 'Reporting & Optimisation'],
    image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&h=600&fit=crop',
  },
  {
    slug: 'it-solutions',
    title: 'General IT Solutions',
    roleValue: 'it-specialist',
    roleLabel: 'IT Specialist',
    icon: Cpu,
    description: 'Comprehensive technology solutions tailored to streamline your business operations.',
    longDescription:
      'We provide end-to-end IT solutions that help businesses optimize their technology infrastructure and achieve digital transformation.',
    features: ['IT Infrastructure Setup', 'Cloud Solutions', 'Network Security', 'Technical Support', 'System Integration'],
    process: ['Needs Assessment', 'Solution Design', 'Implementation', 'Training & Support', 'Ongoing Maintenance'],
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=600&fit=crop',
  },
];

export const getServiceBySlug = (slug: string | undefined) =>
  CORE_SERVICES.find((s) => s.slug === slug);

/** Role options for the talent registration form (core services + "Other"). */
export const TALENT_ROLE_OPTIONS = [
  ...CORE_SERVICES.map((s) => ({ value: s.roleValue, label: s.roleLabel })),
  { value: 'other', label: 'Other' },
];

export const getRoleLabel = (roleValue: string | null | undefined) =>
  TALENT_ROLE_OPTIONS.find((r) => r.value === roleValue)?.label ?? roleValue ?? '';
