type LogoProps = {
  compact?: boolean;
};

/**
 * Zeigt das Diario-Logo an.
 */
export function Logo({ compact = false }: LogoProps) {
  return (
    <div
      className={compact ? "logo logo--compact" : "logo"}
      aria-label="Diario Logo"
    >
      <img
        src="/logo.png"
        alt="Diario Logo"
        className="logo__image"
        draggable={false}
      />
    </div>
  );
}
