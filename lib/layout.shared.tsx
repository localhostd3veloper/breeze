import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { Fragment } from 'react';

export const REPO_URL = 'https://github.com/localhostd3veloper/breeze';

function Brand() {
  return (
    <Fragment>
      <Image alt="Breeze" src="/favicon.svg" width={22} height={22} className="size-[22px]" />
      <span>
        Breeze<span className="text-primary">.</span>
      </span>
    </Fragment>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Brand />,
      url: '/',
    },
    githubUrl: REPO_URL,
    links: [
      {
        text: 'Open Breeze',
        url: '/chat',
      },
    ],
  };
}
