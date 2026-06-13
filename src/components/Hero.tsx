interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

/** Reusable landing-page hero. Edit copy per page. */
export function Hero({ eyebrow, title, subtitle }: HeroProps) {
  return (
    <header className="bg-brand-light">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        {eyebrow && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand">
            {eyebrow}
          </p>
        )}
        <h1 className="text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">{subtitle}</p>
        )}
      </div>
    </header>
  );
}

export default Hero;
