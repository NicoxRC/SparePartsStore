import { ISSUE_LABEL } from '../../lib/purchaseImports';
import type { LineIssue } from '../../services/purchaseImports';

export function IssueBadges({ issues }: { issues: LineIssue[] }) {
  return (
    <>
      {issues.map((issue) => (
        <span
          key={issue}
          className="rounded-full bg-amber-tint px-2.5 py-0.5 text-xs font-medium text-amber"
        >
          {ISSUE_LABEL[issue]}
        </span>
      ))}
    </>
  );
}
