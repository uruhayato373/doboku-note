import type { MDXComponents } from 'mdx/types';
import Admonition from './Admonition';
import MermaidDiagram from './MermaidDiagram';
import AmazonLink from './AmazonLink';

export const mdxComponents: MDXComponents = {
  Admonition,
  AmazonLink,

  // Override pre to handle mermaid code blocks
  pre: ({ children, ...props }: any) => {
    // Check if this is a mermaid code block
    if (children?.props?.className === 'language-mermaid') {
      return <MermaidDiagram chart={children.props.children} />;
    }
    return (
      <pre {...props} className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm">
        {children}
      </pre>
    );
  },

  // Style tables with the wrapper
  table: ({ children, ...props }: any) => (
    <div className="table-wrapper">
      <table {...props} className="min-w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),

  th: ({ children, ...props }: any) => (
    <th scope="col" {...props} className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),

  td: ({ children, ...props }: any) => (
    <td {...props} className="border border-gray-300 px-4 py-2">
      {children}
    </td>
  ),

  // Image with default styling
  img: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ''} {...props} loading="lazy" />
  ),

  // Details / Summary for collapsible sections
  details: ({ children, ...props }: any) => (
    <details {...props} className="my-4 rounded-lg border border-gray-200 p-4">
      {children}
    </details>
  ),

  summary: ({ children, ...props }: any) => (
    <summary {...props} className="cursor-pointer font-semibold">
      {children}
    </summary>
  ),

  // Links - handle internal vs external
  a: ({ href, children, ...props }: any) => {
    const isExternal = href?.startsWith('http');
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
};
