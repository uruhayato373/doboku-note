import type { ReactNode } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 題名つきの区画（shadcn/ui の Card の公式の形: CardHeader の題名・説明・操作 ＋ CardContent）。
 * 1 画面に区画がいくつも並ぶときだけ使う。題名の無い Card（ページ見出しと重なる箱）は作らない
 * ——表だけの画面は TableFrame を直に置く。
 */
export function PanelCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
