"use client";

import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

type AnimatedCardProps = PropsWithChildren<{
  className?: string;
}>;

export function AnimatedCard({ className, children }: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={`card ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}
