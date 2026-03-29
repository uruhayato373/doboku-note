import { ReactNode } from 'react';

const admonitionConfig: Record<string, { color: string; bg: string; border: string; icon: string; defaultTitle: string }> = {
  note: {
    color: 'text-gray-800',
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    icon: '📝',
    defaultTitle: 'Note',
  },
  tip: {
    color: 'text-green-800',
    bg: 'bg-green-50',
    border: 'border-green-500',
    icon: '💡',
    defaultTitle: 'Tip',
  },
  info: {
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: 'ℹ️',
    defaultTitle: 'Info',
  },
  warning: {
    color: 'text-yellow-800',
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    icon: '⚠️',
    defaultTitle: 'Warning',
  },
  danger: {
    color: 'text-red-800',
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: '🚫',
    defaultTitle: 'Danger',
  },
  caution: {
    color: 'text-orange-800',
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    icon: '⚠️',
    defaultTitle: 'Caution',
  },
};

export default function Admonition({
  type = 'note',
  title,
  children,
}: {
  type?: string;
  title?: string;
  children: ReactNode;
}) {
  const config = admonitionConfig[type] || admonitionConfig.note;
  const displayTitle = title || config.defaultTitle;

  return (
    <div className={`my-6 rounded-lg border-l-4 ${config.border} ${config.bg} p-4`}>
      <div className={`font-bold mb-2 ${config.color}`}>
        <span className="mr-2">{config.icon}</span>
        {displayTitle}
      </div>
      <div className={`${config.color} [&>p]:my-1`}>{children}</div>
    </div>
  );
}
