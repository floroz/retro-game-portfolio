/** Small, palette-limited shell icons drawn on the original 32px grid. */
export function Windows98Icon({
  kind,
}: {
  kind: "computer" | "document" | "mail" | "desktop" | "sound";
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {kind === "computer" || kind === "desktop" ? (
        <>
          <path d="M3 2h25v21H3zM10 23h11v4H10zM5 27h23v3H5z" fill="#000" />
          <path d="M4 3h23v19H4zM11 23h9v4h-9zM5 27h22v2H5z" fill="#c0c0c0" />
          <path d="M5 4h21v16H5z" fill="#fff" />
          <path d="M6 5h19v14H6z" fill="#000080" />
          <path d="M7 6h17v12H7z" fill="#008080" />
          <path d="M4 3h23M4 3v19M5 27h22" stroke="#fff" />
          <path d="M21 21h3" stroke="#008000" />
          {kind === "desktop" && <path d="M10 9h11v7H10z" fill="#fff" />}
        </>
      ) : kind === "document" ? (
        <>
          <path d="M6 1h15l6 6v24H6z" fill="#000" />
          <path d="M7 2h13v7h6v21H7z" fill="#fff" />
          <path d="M21 3v5h5" fill="#c0c0c0" />
          <path d="M10 12h12M10 16h12M10 20h12M10 24h8" stroke="#000080" />
          <path d="M4 24h7v7H4z" fill="#fff" stroke="#000" />
          <path d="M6 29v-3h3m-3 0 3 3" stroke="#000" />
        </>
      ) : kind === "mail" ? (
        <>
          <path d="M2 7h28v20H2z" fill="#000" />
          <path d="M3 8h26v18H3z" fill="#ffffdf" />
          <path d="m3 8 13 10L29 8M3 26l10-10m16 10L19 16" stroke="#808080" />
          <path d="M23 10h4v5h-4z" fill="#000080" />
        </>
      ) : (
        <>
          <path d="M3 12h6l9-8v24l-9-8H3z" fill="#000" />
          <path d="M4 13h6l7-6v18l-7-6H4z" fill="#ffff00" />
          <path
            d="M10 13v7M21 11l3 5-3 5m4-14 5 9-5 9"
            stroke="#000"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}
