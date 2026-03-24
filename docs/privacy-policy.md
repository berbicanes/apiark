# ApiArk Privacy Policy

**Effective Date:** March 2026

## Summary

ApiArk collects **zero data by default**. Your API requests, responses, collections, environments, secrets, and usage patterns never leave your machine unless you explicitly choose to share them.

## What We Collect

### By Default: Nothing

ApiArk is a local-first application. All data is stored on your local filesystem:

- **Collections**: YAML files in directories you choose
- **Environments**: YAML files within collection directories
- **Secrets**: `.env` files (gitignored by default)
- **History**: SQLite database at `~/.apiark/data.db`
- **Settings**: JSON file at `~/.apiark/settings.json`

None of this data is transmitted anywhere.

### Opt-In: Crash Reports

On first launch, ApiArk asks if you'd like to send anonymous crash reports. The default is **No**.

If you opt in, crash reports contain:
- Stack trace
- Operating system and version
- App version
- Anonymized error context

Crash reports **never** contain:
- Request URLs, headers, or bodies
- Response data
- Environment variables or secrets
- Collection names or structure
- Usage patterns or analytics

Crash reports are stored locally at `~/.apiark/crash-reports/` as JSON files. You can inspect and delete them at any time.

### Network Connections

ApiArk makes no network calls by default. The only external connections are API requests you explicitly send, OAuth flows you initiate, and update checks against our release server.

## What We Don't Collect

- Analytics or telemetry
- Usage metrics or behavioral data
- IP addresses (beyond normal HTTPS connections for license checks)
- Device fingerprints
- Browsing or API request history
- Any content from your collections

## Third Parties

ApiArk includes **no third-party analytics, tracking, or advertising SDKs**. We do not use Google Analytics, Mixpanel, Segment, Sentry, or any similar service.

## Data Storage

All user data resides on your local filesystem. ApiArk does not operate any cloud storage or synchronization service.

## Data Deletion

To delete all ApiArk data:
1. Uninstall the application
2. Delete `~/.apiark/` directory
3. Delete any collection directories you created

That's it.

## Children's Privacy

ApiArk does not knowingly collect any information from children under 13.

## Changes to This Policy

We will update this policy as needed. Changes will be noted in release notes and the app's changelog.

## Contact

For privacy questions: privacy@apiark.dev
