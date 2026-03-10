import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "full" | "mark";
};

const LOGO_CONFIG = {
  full: {
    alt: "KC Building Your Future logo",
    height: 260,
    src: "/kc-logo.svg",
    width: 820,
  },
  mark: {
    alt: "KC logo mark",
    height: 256,
    src: "/kc-mark.svg",
    width: 256,
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
