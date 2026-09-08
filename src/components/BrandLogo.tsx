/**
 * Mažas degalinių tinklo logotipas sąraše.
 * Naudojame tinklo spalvas ir inicialus – jei tinklas nežinomas,
 * rodoma neutrali degalinės ikonėlė (niekada ne tuščia vieta).
 */
const BRAND_STYLE: Record<string, { bg: string; fg: string; short: string }> = {
  Viada: { bg: "#e11d48", fg: "#ffffff", short: "V" },
  "Circle K": { bg: "#d61f26", fg: "#ffd200", short: "CK" },
  Neste: { bg: "#00a0d6", fg: "#ffffff", short: "N" },
  "Baltic Petroleum": { bg: "#0f6b3a", fg: "#ffffff", short: "BP" },
  Orlen: { bg: "#c8102e", fg: "#ffffff", short: "O" },
  Emsi: { bg: "#1d4ed8", fg: "#ffffff", short: "E" },
  Lukoil: { bg: "#b91c1c", fg: "#ffffff", short: "L" },
};

export function BrandLogo({ brand, size = 28 }: { brand: string; size?: number }) {
  const style = BRAND_STYLE[brand];

  if (!style) {
    return (
      <span
        aria-hidden
        className="grid shrink-0 place-items-center rounded-lg bg-ice/10 ring-1 ring-ice/15"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        ⛽
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg font-bold ring-1 ring-ice/15"
      style={{
        width: size,
        height: size,
        background: style.bg,
        color: style.fg,
        fontSize: style.short.length > 1 ? size * 0.36 : size * 0.48,
      }}
    >
      {style.short}
    </span>
  );
}
