import { PERMISSION_SCOPES, type PermissionCode } from '../lib/permissions';

interface PermissionsEditorProps {
  value: PermissionCode[];
  onChange: (permissions: PermissionCode[]) => void;
}

/**
 * Checkboxes grouped by scope, each with a "Ver" checkbox plus its action
 * checkboxes nested beneath. Mirrors the server's implication rule
 * client-side: checking any action auto-checks and disables unchecking
 * the scope's "Ver" — avoids a checkbox state the server would silently
 * rewrite anyway (see permission.constant.ts's expandPermissions), which
 * would otherwise look like a bug.
 */
export function PermissionsEditor({ value, onChange }: PermissionsEditorProps) {
  const has = (code: PermissionCode) => value.includes(code);

  const toggle = (code: PermissionCode, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...value, code])]);
    } else {
      onChange(value.filter((c) => c !== code));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {PERMISSION_SCOPES.map(({ scope, label, actions }) => {
        const viewCode = actions[0].code;
        const nonViewActions = actions.slice(1);
        const anyActionChecked = nonViewActions.some((action) => has(action.code));

        return (
          <fieldset key={scope} className="rounded border border-line p-3">
            <legend className="px-1 text-sm font-semibold text-ink">{label}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              <label className="flex items-center gap-2 text-sm text-steel">
                <input
                  type="checkbox"
                  checked={has(viewCode)}
                  disabled={anyActionChecked}
                  onChange={(e) => toggle(viewCode, e.target.checked)}
                  className="h-4 w-4 rounded-sm border-line-2"
                />
                {actions[0].label}
              </label>
              {nonViewActions.map((action) => (
                <label key={action.code} className="flex items-center gap-2 text-sm text-steel">
                  <input
                    type="checkbox"
                    checked={has(action.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...new Set([...value, action.code, viewCode])]);
                      } else {
                        toggle(action.code, false);
                      }
                    }}
                    className="h-4 w-4 rounded-sm border-line-2"
                  />
                  {action.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
