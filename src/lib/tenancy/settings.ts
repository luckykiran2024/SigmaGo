export const TENANT_SETTINGS_ALLOWLIST = new Set([
  'name',
  'logo_url',
  'primary_color',
  'support_email',
  'default_timezone',
  'allow_external_participants',
  'enforce_mfa',
]);

export const FORBIDDEN_SETTINGS_FIELDS = new Set([
  'plan',
  'dkim_verified',
  'powered_by',
  'subdomain',
  'secret_version',
  'secret_rotated_at',
]);

/**
 * Validates patch payload for tenant settings updates.
 * Throws error if payload attempts to update non-allowlisted fields such as plan, dkim_verified, or powered_by.
 */
export function validateTenantSettingsPatch(patch: Record<string, any>): Record<string, any> {
  if (!patch || typeof patch !== 'object') {
    throw new Error('Invalid patch payload');
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (FORBIDDEN_SETTINGS_FIELDS.has(key)) {
      throw new Error(`Unauthorized settings field update: Field '${key}' is read-only and cannot be updated by tenant admins.`);
    }

    if (TENANT_SETTINGS_ALLOWLIST.has(key)) {
      sanitized[key] = value;
    } else {
      throw new Error(`Unauthorized settings field update: Field '${key}' is not in the allowed settings updates list.`);
    }
  }

  return sanitized;
}
