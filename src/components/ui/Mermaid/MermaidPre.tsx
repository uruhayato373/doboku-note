import React from 'react';
import Mermaid from './Mermaid';

interface PreProps {
  children?: React.ReactNode;
}

/**
 * MDX の <pre> 要素をオーバーライド。
 * ```mermaid ... ``` コードブロックを Mermaid コンポーネントに差し替える。
 */
export default function MermaidPre({ children }: PreProps) {
  if (React.isValidElement(children)) {
    const childProps = children.props as {
      className?: string;
      children?: string;
    };

    if (
      childProps.className?.includes('language-mermaid') &&
      typeof childProps.children === 'string'
    ) {
      return <Mermaid code={childProps.children.trim()} />;
    }
  }

  return <pre>{children}</pre>;
}
