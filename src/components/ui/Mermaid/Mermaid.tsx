'use client';

import { useEffect, useRef, useId } from 'react';

interface MermaidProps {
  code: string;
}

export default function Mermaid({ code }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const id = `mermaid-${rawId.replace(/:/g, '')}`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        flowchart: { curve: 'basis' },
      });

      if (!ref.current || cancelled) return;

      try {
        const { svg } = await mermaid.render(id, code);
        if (ref.current && !cancelled) {
          ref.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto"
      aria-label="図表"
    />
  );
}
