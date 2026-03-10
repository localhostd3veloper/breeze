'use client';
import { Progress as ProgressPrimitive } from 'radix-ui';
import { ComponentProps } from 'react';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Progress({ className, value, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'bg-muted relative flex h-1 w-full items-center overflow-x-hidden rounded-md',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary size-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
