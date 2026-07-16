interface RichTextProps {
  html: string | null | undefined;
  className?: string;
}

export function RichText({ html, className }: RichTextProps) {
  if (!html) return null;

  return (
    <div
      className={["rich-text", className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
