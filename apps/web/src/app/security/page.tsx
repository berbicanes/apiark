"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const sections = [
  {
    title: "Reporting Vulnerabilities",
    items: [
      "Email security@apiark.dev with details of the vulnerability.",
      "You can also report via GitHub Security Advisories on our repository.",
      "We will acknowledge receipt within 48 hours and provide a timeline for a fix.",
      "Please do not disclose publicly until we have released a patch.",
    ],
  },
  {
    title: "Architecture Security",
    items: [
      "Tauri v2 capability-based permissions — each window gets only the IPC commands it needs.",
      "Content Security Policy: no eval(), no remote scripts, no inline scripts.",
      "Frontend cannot execute arbitrary shell commands or access filesystem outside scoped directories.",
      "All IPC commands are explicitly defined — no open-ended shell access from the webview.",
    ],
  },
  {
    title: "Secret Handling",
    items: [
      "Environment secrets from .env files are loaded into Rust memory only.",
      "Secrets are never written to SQLite history — auth tokens are replaced with [REDACTED].",
      "Secrets are never written to log files.",
      "Secret variables are masked in the UI by default, revealable per-variable.",
    ],
  },
  {
    title: "Data Safety",
    items: [
      "All file writes use atomic write: write to .tmp file, then rename() to target.",
      "File saves are serialized per-collection to prevent race conditions.",
      "SQLite uses WAL mode for crash resilience.",
      "On startup, SQLite integrity is checked — corrupt databases are backed up and a fresh DB is created.",
    ],
  },
  {
    title: "Dependency Auditing",
    items: [
      "cargo audit runs in CI on every pull request, blocking merge on known vulnerabilities.",
      "pnpm audit runs in CI, blocking on high/critical severity.",
      "New dependencies are manually reviewed before adding: license, maintenance, security history.",
    ],
  },
  {
    title: "Network Security",
    items: [
      "ApiArk makes no network calls by default — zero telemetry, zero analytics.",
      "No license validation calls — all features are free, no keys required.",
      "Update checks are non-blocking and silently skipped if offline.",
      "Proxy capture mode binds to 127.0.0.1 only — not accessible from the network.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-white mb-4">Security</h1>
            <p className="text-zinc-400 mb-12">
              How ApiArk protects your data and our approach to security.
            </p>
          </motion.div>

          <div className="space-y-12">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <h2 className="text-xl font-semibold text-white mb-4">
                  {section.title}
                </h2>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-zinc-400 leading-relaxed flex gap-2">
                      <span className="text-zinc-600 shrink-0">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <p className="mt-16 text-xs text-zinc-600">
            Last updated: March 2026
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
