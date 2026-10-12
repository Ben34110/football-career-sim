import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/** Lets the web version be installed to the home screen and play offline (see public/sw.js). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ultime Player',
    short_name: 'Ultime Player',
    description: 'Build a football legend: locker rooms, press zones, clutch moments and 8-zone penalties.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
