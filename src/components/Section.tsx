import type { ReactNode } from "react";

interface SectionProps {
  id?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Generic content section wrapper for landing pages. */
export function Section({ id, title, children, className = "" }: SectionProps) {
  return (
    <section id={id} className={`mx-auto max-w-3xl px-6 py-12 ${className}`}>
      {title && (
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">{title}</h2>
      )}
      {children}
    </section>
  );
}

export default Section;
