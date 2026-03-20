import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  disable3d?: boolean;
}

export const GlassCard = ({ children, className, id, disable3d = false }: GlassCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disable3d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      id={id}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={disable3d ? {} : { scale: 1.01 }}
      style={{
        rotateY: disable3d ? 0 : rotateY,
        rotateX: disable3d ? 0 : rotateX,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]",
        className
      )}
    >
      <div
        style={{
          transform: disable3d ? "none" : "translateZ(75px)",
          transformStyle: "preserve-3d",
        }}
        className="relative z-10 h-full w-full"
      >
        {children}
      </div>
      
      {/* 3D Glow effect */}
      {!disable3d && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </motion.div>
  );
};
