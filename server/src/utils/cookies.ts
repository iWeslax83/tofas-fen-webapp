/**
 * Central policy for auth cookie flags.
 *
 * These were previously hardcoded to `sameSite: 'strict'` in a dozen places,
 * which is correct only when the SPA and the API are served from the same
 * site. They are not in the managed-hosting setup: the frontend lives on
 * Vercel and the API on Render, which are different registrable domains, so
 * every request from the SPA to the API is cross-site. A `Strict` (or `Lax`)
 * cookie is simply never attached to a cross-site request -- the browser drops
 * it, login appears to succeed, and the next call comes back 401.
 *
 * Cross-site cookies must be `SameSite=None`, and `None` is only honoured
 * together with `Secure` (HTTPS).
 *
 * `SameSite=None` gives up the browser's built-in CSRF protection, so it is
 * opt-in rather than the default. The app carries its own defence -- the
 * double-submit `csrfToken` cookie checked against the `X-CSRF-Token` header --
 * which is what keeps this safe. Do not set `none` on a deployment that lacks
 * that check.
 *
 * The better long-term answer is to put both behind one registrable domain
 * (app.example.com + api.example.com), at which point `strict` works again and
 * this can go back to the default.
 */

type SameSite = 'strict' | 'lax' | 'none';

const VALID: readonly SameSite[] = ['strict', 'lax', 'none'];

/**
 * `COOKIE_SAMESITE` -- set to `none` when the SPA and API are on different
 * domains. Defaults to `strict`, the safest value, so an unconfigured
 * deployment fails closed rather than silently relaxing CSRF protection.
 */
export function cookieSameSite(): SameSite {
  const configured = process.env.COOKIE_SAMESITE?.toLowerCase();

  if (!configured) {
    return 'strict';
  }

  if (!VALID.includes(configured as SameSite)) {
    throw new Error(`COOKIE_SAMESITE must be one of ${VALID.join(', ')} (got: ${configured}).`);
  }

  return configured as SameSite;
}

/**
 * Cookies are Secure in production. `SameSite=None` additionally *requires*
 * Secure -- browsers reject a `None` cookie without it -- so it forces the
 * flag on regardless of environment.
 */
export function cookieSecure(): boolean {
  return process.env.NODE_ENV === 'production' || cookieSameSite() === 'none';
}
