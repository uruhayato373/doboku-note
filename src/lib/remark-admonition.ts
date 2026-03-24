import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

/**
 * Custom remark plugin to transform container directives (:::note, :::tip, etc.)
 * into Admonition JSX components.
 *
 * Input (remark-directive parses this):
 *   :::note
 *   Content here
 *   :::
 *
 *   :::info[Custom Title]
 *   Content here
 *   :::
 *
 * Output (mdast-to-hast will produce):
 *   <Admonition type="note">Content</Admonition>
 *   <Admonition type="info" title="Custom Title">Content</Admonition>
 */
export const remarkAdmonition: Plugin = () => {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const type = node.name;
        const validTypes = ['note', 'tip', 'info', 'warning', 'danger', 'caution'];

        if (!validTypes.includes(type)) return;

        // Extract title from directive label: :::info[Title]
        const title =
          node.children?.[0]?.data?.directiveLabel === true
            ? nodeToString(node.children[0])
            : undefined;

        // Remove the label node from children if it exists
        const children =
          node.children?.[0]?.data?.directiveLabel === true
            ? node.children.slice(1)
            : node.children;

        // Transform into JSX element
        node.type = 'mdxJsxFlowElement';
        node.name = 'Admonition';
        node.attributes = [
          { type: 'mdxJsxAttribute', name: 'type', value: type },
        ];
        if (title) {
          node.attributes.push({
            type: 'mdxJsxAttribute',
            name: 'title',
            value: title,
          });
        }
        node.children = children;
      }
    });
  };
};

function nodeToString(node: any): string {
  if (typeof node === 'string') return node;
  if (node.value) return node.value;
  if (node.children) return node.children.map(nodeToString).join('');
  return '';
}
