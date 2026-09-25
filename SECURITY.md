# Security

The project has no automatic telemetry, remote effect service, or credential handling. Water sources and captured DOM are still subject to normal browser security restrictions.

Do not pass untrusted HTML into a capture workflow as a substitute for sanitization. Do not load arbitrary script URLs or expose your development server to an untrusted network. The included server binds to loopback unless `HOST` is explicitly configured.

Before publishing the repository, enable GitHub private vulnerability reporting or define an appropriate private contact. Do not post exploit details, credentials, private documents, or unredacted diagnostic reports in a public issue.

No security-audit certification is claimed. Dependencies used only by development/testing tools have their own update and security requirements.
