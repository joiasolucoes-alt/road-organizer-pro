import logoFull from "@/assets/logo-full.png.asset.json";
import logoMaster from "@/assets/logo-master.png.asset.json";

interface Props {
  variant?: "full" | "mark";
  className?: string;
}

export function AppLogo({ variant = "full", className }: Props) {
  const src = variant === "full" ? logoFull.url : logoMaster.url;
  return (
    <img
      src={src}
      alt="Master Distribuidora"
      className={className}
      loading="eager"
    />
  );
}