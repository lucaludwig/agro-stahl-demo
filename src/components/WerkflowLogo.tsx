/** werkflow Markenlogo als SVG-Komponente */
export function WerkflowLogo({
  size = 32,
  color = "#ffffff",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="6"
        y="3"
        width="38"
        height="50"
        rx="10"
        stroke={color}
        strokeWidth="7"
      />
      <rect
        x="6"
        y="65"
        width="38"
        height="32"
        rx="10"
        stroke={color}
        strokeWidth="7"
      />
      <rect
        x="56"
        y="3"
        width="38"
        height="32"
        rx="10"
        stroke={color}
        strokeWidth="7"
      />
      <rect
        x="56"
        y="47"
        width="38"
        height="50"
        rx="10"
        stroke={color}
        strokeWidth="7"
      />
    </svg>
  );
}
