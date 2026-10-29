export default function LangToggle({ lang, onChange, label, compact = false }) {
  const options = [
    ['hi', 'हिन्दी'],
    ['en', 'English'],
  ];
  return (
    <div
      role="group"
      aria-label={label}
      className="grid w-full max-w-full grid-cols-2 overflow-hidden rounded-2xl ring-2 ring-stone-900 sm:w-auto"
    >
      {options.map(([code, text]) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => onChange(code)}
          className={`${compact ? 'min-h-[44px]' : 'min-h-[52px]'} min-w-0 appearance-none whitespace-nowrap rounded-none border-0 px-4 text-lg font-bold sm:px-5 sm:text-xl ${
            lang === code ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
