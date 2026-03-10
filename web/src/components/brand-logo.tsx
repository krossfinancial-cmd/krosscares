import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "full" | "mark";
};

const LOGO_CONFIG = {
  full: {
    alt: "Kross Concepts logo",
    height: 1100,
    src: "/kc-logo.png",
    width: 1600,
  },
  mark: {
    alt: "Kross Concepts logo mark",
    height: 1200,
    src: "/kc-mark.png",
    width: 1200,
  },
} as const;

export function BrandLogo({ className, priority = false, variant = "full" }: BrandLogoProps) {
  const config = LOGO_CONFIG[variant];

  return (
    <Image
      alt={config.alt}
      className={className}
      height={config.height}
      priority={priority}
      src={config.src}
      width={config.width}
    />
  );
}
