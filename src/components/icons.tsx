// أيقونة سِنّ مخصّصة بنمط Lucide (stroke + currentColor)
export function Tooth({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden>
      <path d="M7 3.5C4.7 3.5 3 5.4 3 7.8c0 1.5.5 2.7.9 4.2.3 1.1.5 2.3.6 3.7.2 2.4.5 4.3 1.6 4.3 1 0 1.3-1.4 1.6-2.9.3-1.4.6-2.8 1.3-2.8s1 1.4 1.3 2.8c.3 1.5.6 2.9 1.6 2.9 1.1 0 1.4-1.9 1.6-4.3.1-1.4.3-2.6.6-3.7.4-1.5.9-2.7.9-4.2 0-2.4-1.7-4.3-4-4.3-1.3 0-2.4.6-3 1.5-.6-.9-1.7-1.5-3-1.5Z" />
    </svg>
  );
}
