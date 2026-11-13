"use client";

import React from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  MotionProps & {
    children?: React.ReactNode;
    as?: any;
  };

/**
 * AnimatedButton
 * Theme-aware button with animated border shine and text sweep mask.
 * Accepts all native button props (onClick, className, type, disabled, etc.)
 */
const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children = "Send for Printing",
  className = "",
  as = "button",
  ...rest
}) => {
  const Component = (motion as any)[as] || motion.button;

  return (
    <Component
      {...rest}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.5,
      }}
      className={cn(
        "group inline-flex items-center justify-center px-6 py-3.5 rounded-2xl relative overflow-hidden",
        "font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-60 cursor-pointer shadow-md",
        "[--shine:rgba(255,255,255,0.75)]",
        className
      )}
    >
      {/* Text with shine mask */}
      <motion.span
        className="flex items-center justify-center h-full w-full relative z-10"
        style={{
          WebkitMaskImage:
            "linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))",
          maskImage:
            "linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))",
        }}
        initial={{ ["--mask-x" as any]: "100%" } as any}
        animate={{ ["--mask-x" as any]: "-100%" } as any}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "linear",
          repeatDelay: 1.5,
        }}
      >
        {children}
      </motion.span>

      {/* Border shine effect using the --shine variable */}
      <motion.span
        className="block absolute inset-0 rounded-[inherit] p-px pointer-events-none"
        style={{
          background:
            "linear-gradient(-75deg, transparent 30%, var(--shine) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
        }}
        initial={{ backgroundPosition: "100% 0", opacity: 0 }}
        animate={{ backgroundPosition: ["100% 0", "0% 0"], opacity: [0, 1, 0] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 1.5,
        }}
      />
    </Component>
  );
};

export default AnimatedButton;
