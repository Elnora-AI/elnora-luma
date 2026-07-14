# Security Policy

## Supported Versions

The latest published `0.x` release is supported. Once `1.0.0` ships, the current
major line is supported.

## Reporting a Vulnerability

**DO NOT open a public GitHub issue for security vulnerabilities.**

Please report security vulnerabilities via one of the following channels:

- **Email:** [security@elnora.ai](mailto:security@elnora.ai)
- **GitHub Security Advisories:** [Report a vulnerability](https://github.com/Elnora-AI/elnora-luma/security/advisories/new)

Include as much detail as possible:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgement:** Within 48 hours of report
- **Initial assessment:** Within 5 business days
- **Fix and disclosure:** Within 90 days of report

## Responsible Disclosure

We follow a 90-day disclosure timeline. We ask that you:

- Allow us reasonable time to fix the issue before public disclosure
- Do not access or modify other users' data
- Do not perform actions that could negatively impact other users
- Act in good faith to avoid privacy violations, data destruction, and service disruption

## Scope

**In scope:**

- The `elnora-luma` CLI and plugin code in this repository
- Credential handling (env-var resolution, `~/.config/elnora-luma/.env` storage, the strict env-file key allowlist)
- Request construction against `public-api.luma.com` and `api.luma.com`

**Out of scope:**

- Third-party dependencies (please report to their respective maintainers)
- The Luma API itself (report to Luma)
- Social engineering attacks against Elnora staff
- Denial of service attacks
- Issues in services not operated by Elnora

## The two credentials — read before use

- **`LUMA_API_KEY`** — Luma's official public-API key (header `x-luma-api-key`).
  Calendar-scoped, generated at `https://luma.com/calendar/manage/api-keys`
  (requires Luma Plus). Revocable from the same page. This is the only
  credential the 61 spec-driven commands ever use.
- **`LUMA_AUTH_SESSION_KEY`** — **a live browser session cookie**
  (`luma.auth-session-key` from a logged-in host session). It is NOT an API
  key: it grants the same access as being logged in to luma.com as you,
  across every calendar you can see. It is only read by the handful of
  `event` admin commands (undocumented host-dashboard endpoints, almost all
  read-only). Treat it like a password:
  - Set it only when you actually need an admin command; remove it afterwards.
  - It expires on its own; a `401` means re-grab it from DevTools.
  - Never commit it, never share it, never put it in CI.

## Security Best Practices for Users

- Never commit credentials to version control — keep them in
  `~/.config/elnora-luma/.env` (created with `0600` by `luma auth set-key`) or
  your environment.
- `.env` parsing uses a strict 2-key allowlist (`LUMA_API_KEY`,
  `LUMA_AUTH_SESSION_KEY`); nothing else is read from env files, and no
  directory outside the config dir or the CLI's own folder is ever touched.
- The CLI talks only to `public-api.luma.com` and (for admin commands)
  `api.luma.com` over HTTPS. There is no telemetry and no third-party endpoint.
- Rotate the API key periodically, and revoke immediately if one is exposed.
- Guest lists, payment info, and survey responses returned by this CLI are
  personal data — handle exports (CSV files, etc.) accordingly.
