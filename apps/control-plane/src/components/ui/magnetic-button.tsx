'use client';

import { HTMLMotionProps, motion } from 'framer-motion';
import { useRef, useState, MouseEvent, ReactNode } from 'react';
import { cn } from './animate-in';

interface MagneticButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  className?: string;
}

export function MagneticButton({ children, className, disabled, ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      disabled={disabled}
      {...props}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={cn('relative', className)}
    >
      {children}
    </motion.button>
  );
}
