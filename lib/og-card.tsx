/**
 * Shared markup for the generated Open Graph images (next/og ImageResponse).
 * Recipes carry no photo, so a branded Catppuccin-Mocha card with the title is
 * the best link preview we can offer. Uses only flexbox styling (the subset
 * ImageResponse supports) and the bundled default font.
 */
export function OgCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#1e1e2e",
        padding: "72px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            backgroundColor: "#a6e3a1",
            marginRight: "20px",
          }}
        />
        <div style={{ color: "#a6adc8", fontSize: "32px" }}>
          Kaeru&apos;s Kitchen Hub
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            color: "#cdd6f4",
            fontSize: "72px",
            fontWeight: 700,
            lineHeight: 1.1,
            // Keep very long titles from overflowing the card.
            display: "block",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <div style={{ color: "#a6e3a1", fontSize: "36px", marginTop: "24px" }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}
