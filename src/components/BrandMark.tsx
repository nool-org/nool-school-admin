/** The noolAI wordmark - the same as the app's (nool-apps BrandMark): "nool"
 * ink, "AI" yellow, in Plus Jakarta - the logo is the brand, not the theme. */
export function BrandMark({
  suffix,
  size = 22,
}: {
  suffix?: string;
  size?: number;
}) {
  return (
    <span
      className="brand-mark"
      aria-label={suffix ? `noolAI ${suffix}` : "noolAI"}
    >
      <span
        className="brand-word"
        style={{ fontSize: size, letterSpacing: -size * 0.06 }}
      >
        nool<span className="brand-ai">AI</span>
      </span>
      {suffix ? <span className="brand-suffix">{suffix}</span> : null}
    </span>
  );
}
