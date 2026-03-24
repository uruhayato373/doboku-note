'use client';

export default function AffiliateBanner({ html }: { html: string }) {
  return (
    <div
      className="my-4 flex justify-center"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
