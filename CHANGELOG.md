# Changelog

## [0.1.1](https://github.com/Elnora-AI/elnora-luma/compare/v0.1.0...v0.1.1) (2026-07-15)


### Features

* initial release — Luma API CLI + Claude Code plugin ([5fd9d3b](https://github.com/Elnora-AI/elnora-luma/commit/5fd9d3ba7dbb2798c48d7ceb57baf98515ac244a))
* read-only reporting, roster export, change digests, and Stripe reconciliation ([a5f7f45](https://github.com/Elnora-AI/elnora-luma/commit/a5f7f4555f1b36e9c2b49654103fe0fc24853c2e))
* read-only reporting, roster export, change digests, and Stripe reconciliation ([892aaea](https://github.com/Elnora-AI/elnora-luma/commit/892aaeace890aff9bd78c407869e872ab2d67d4d))


### Bug Fixes

* remove TOCTOU window in auth env-file upsert ([cb895e6](https://github.com/Elnora-AI/elnora-luma/commit/cb895e6c65913b01363ca2056f99c5f099eb5649))

## 0.1.0 (2026-07-14)

Initial release: spec-driven CLI covering all 61 `public-api.luma.com` endpoints, read-only admin-API commands, `auth set-key` / `auth status`, and 9 Claude Code skills with safety guardrails for guest, ticket, and email operations.
