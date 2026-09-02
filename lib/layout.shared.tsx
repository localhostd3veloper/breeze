import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { Fragment } from 'react';

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
    githubUrl: 'https://github.com',
  };
}
