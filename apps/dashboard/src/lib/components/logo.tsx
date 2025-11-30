interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const dotSizeClasses = {
    sm: "w-1.5 h-1.5 -top-0.5 -right-2",
    md: "w-2 h-2 -top-0.5 -right-2.5",
    lg: "w-2.5 h-2.5 -top-1 -right-3",
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <span className={`${sizeClasses[size]} tracking-tight`}>
        <span className="font-black">GREET</span>
        <span className="font-light">NOW</span>
      </span>
      <span
        className={`absolute ${dotSizeClasses[size]} bg-red-500 rounded-full animate-pulse`}
      />
    </div>
  );
}

