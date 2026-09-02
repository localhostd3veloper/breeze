import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Breeze',
      url: '/',
    },
    githubUrl: 'https://github.com',
  };
}
