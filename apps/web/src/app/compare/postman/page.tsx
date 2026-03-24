"use client";

import { motion } from "framer-motion";
import {
  Check,
  X,
  Minus,
  Download,
  ShieldAlert,
  UserX,
  DatabaseZap,
  Lock,
  ArrowRight,
  Zap,
  Clock,
  HardDrive,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 32, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const statsComparison = [
  {
    label: "RAM Usage",
    apiark: "~50MB",
    postman: "300-800MB",
    icon: Zap,
    improvement: "16x less",
    color: "#6366f1",
  },
  {
    label: "Startup Time",
    apiark: "<2s",
    postman: "10-30s",
    icon: Clock,
    improvement: "15x faster",
    color: "#22c55e",
  },
  {
    label: "Download Size",
    apiark: "~20MB",
    postman: "200MB+",
    icon: HardDrive,
    improvement: "10x smaller",
    color: "#06b6d4",
  },
  {
    label: "Price",
    apiark: "Free forever",
    postman: "$19/user/mo",
    icon: DollarSign,
    improvement: "Free forever",
    color: "#f59e0b",
  },
];

type CellValue = "yes" | "no" | "partial" | string;

interface ComparisonRow {
  feature: string;
  apiark: CellValue;
  postman: CellValue;
}

const comparisonRows: ComparisonRow[] = [
  { feature: "Account Required", apiark: "no", postman: "yes" },
  { feature: "Works Offline", apiark: "yes", postman: "partial" },
  { feature: "Data Storage", apiark: "Local filesystem (YAML)", postman: "Cloud (proprietary)" },
  { feature: "Open Source", apiark: "MIT License", postman: "no" },
  { feature: "REST", apiark: "yes", postman: "yes" },
  { feature: "GraphQL", apiark: "yes", postman: "yes" },
  { feature: "gRPC", apiark: "yes", postman: "yes" },
  { feature: "WebSocket", apiark: "yes", postman: "yes" },
  { feature: "SSE", apiark: "yes", postman: "yes" },
  { feature: "MQTT", apiark: "yes", postman: "no" },
  { feature: "Mock Servers", apiark: "Local (unlimited)", postman: "Cloud only (limited)" },
  { feature: "Monitoring", apiark: "Local (unlimited)", postman: "Cloud only (limited)" },
  { feature: "Collection Runner", apiark: "yes", postman: "25 runs/mo free" },
  { feature: "CLI Tool", apiark: "yes", postman: "Newman" },
  { feature: "Plugin System", apiark: "JS + WASM", postman: "no" },
  { feature: "Git-Friendly", apiark: "yes", postman: "no" },
  { feature: "Import/Export", apiark: "Postman, Bruno, Insomnia, OpenAPI, HAR, cURL", postman: "Limited" },
  { feature: "Proxy Capture", apiark: "yes", postman: "no" },
  { feature: "Code Generation", apiark: "yes", postman: "yes" },
  { feature: "Framework", apiark: "Tauri v2 (Rust)", postman: "Electron" },
];

function CellDisplay({ value }: { value: CellValue }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15">
        <Check className="w-4 h-4 text-emerald-400" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/15">
        <X className="w-4 h-4 text-red-400" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15">
        <Minus className="w-4 h-4 text-amber-400" />
      </span>
    );
  }
  return <span className="text-sm text-zinc-300">{value}</span>;
}

const painPoints = [
  {
    icon: UserX,
    title: "Forced accounts",
    description:
      "Since 2023, Postman requires a login to use the app. No account, no access. ApiArk has zero login requirement -- never has, never will.",
    color: "#ef4444",
  },
  {
    icon: ShieldAlert,
    title: "30,000 workspaces leaked",
    description:
      "In December 2024, over 30,000 Postman workspaces were found publicly accessible, exposing API keys, tokens, and secrets. ApiArk stores everything locally on your filesystem.",
    color: "#f59e0b",
  },
  {
    icon: DatabaseZap,
    title: "Resource hog",
    description:
      "Postman uses 300-800MB RAM at baseline, with reported spikes up to 15-18GB. Startup takes 10-30 seconds. ApiArk uses ~50MB RAM and starts in under 2 seconds.",
    color: "#8b5cf6",
  },
  {
    icon: Lock,
    title: "Vendor lock-in",
    description:
      "Postman uses a proprietary data format tied to their cloud. ApiArk stores collections as plain YAML files on your filesystem -- open them with any text editor, version them with Git.",
    color: "#06b6d4",
  },
];

const migrationSteps = [
  {
    step: "1",
    title: "Export from Postman",
    description: "Open Postman, select your collection, click Export, choose Collection v2.1 JSON.",
  },
  {
    step: "2",
    title: "Import into ApiArk",
    description: "Open ApiArk, press Ctrl+I or click Import, select the exported JSON file.",
  },
  {
    step: "3",
    title: "Done",
    description: "Your collections, environments, headers, auth, and scripts are converted to YAML. Start working.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ComparePostmanPage() {
  return (
    <>
      <Navbar />

      <main className="relative min-h-screen pt-32 pb-24">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-500/[0.06] rounded-full blur-[140px]" />
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-red-500/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center mb-20"
          >
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-sm text-zinc-400">
                Detailed comparison
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
            >
              <span className="text-indigo-400">ApiArk vs Postman</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto"
            >
              Everything Postman does, without the bloat, the cloud, or the
              $19/month.
            </motion.p>
          </motion.div>

          {/* Stats comparison cards */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-24"
          >
            {statsComparison.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center"
                >
                  <div
                    className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: stat.color }} />
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">{stat.label}</p>

                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div>
                      <p className="text-lg font-bold text-indigo-400">
                        {stat.apiark}
                      </p>
                      <p className="text-[10px] text-zinc-600">ApiArk</p>
                    </div>
                    <span className="text-zinc-600">vs</span>
                    <div>
                      <p className="text-lg font-bold text-zinc-500">
                        {stat.postman}
                      </p>
                      <p className="text-[10px] text-zinc-600">Postman</p>
                    </div>
                  </div>

                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${stat.color}15`,
                      color: stat.color,
                    }}
                  >
                    {stat.improvement}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Feature comparison table */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-24"
          >
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Feature-by-feature comparison
              </span>
            </h2>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-6 py-4 text-sm font-medium text-zinc-400 w-56">
                        Feature
                      </th>
                      <th className="px-6 py-4 text-sm font-semibold text-center bg-indigo-500/[0.08] text-indigo-300">
                        <span className="block text-[10px] uppercase tracking-widest text-indigo-400 mb-1">
                          Winner
                        </span>
                        ApiArk
                      </th>
                      <th className="px-6 py-4 text-sm font-semibold text-center text-zinc-300">
                        Postman
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr
                        key={row.feature}
                        className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] ${
                          i % 2 === 0 ? "" : "bg-white/[0.01]"
                        }`}
                      >
                        <td className="px-6 py-3.5 text-sm font-medium text-zinc-300">
                          {row.feature}
                        </td>
                        <td className="px-6 py-3.5 text-center bg-indigo-500/[0.06]">
                          <span className="inline-flex justify-center">
                            <CellDisplay value={row.apiark} />
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="inline-flex justify-center">
                            <CellDisplay value={row.postman} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Why developers are switching */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-24"
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold tracking-tight text-center mb-4"
            >
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Why developers are switching
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto"
            >
              Postman was great. Then it got bloated, started requiring logins,
              leaked 30,000 workspaces, and priced out individual developers.
            </motion.p>

            <div className="grid gap-6 sm:grid-cols-2">
              {painPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <motion.div
                    key={point.title}
                    variants={fadeUp}
                    className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-white/[0.1] hover:bg-white/[0.03]"
                  >
                    <div
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${point.color}15` }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: point.color }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {point.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {point.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Switch in 60 seconds */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="mb-24"
          >
            <h2 className="text-3xl font-bold tracking-tight text-center mb-4">
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Switch in 60 seconds
              </span>
            </h2>
            <p className="text-center text-zinc-400 mb-12 max-w-lg mx-auto">
              Moving from Postman to ApiArk takes three steps.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-6 max-w-3xl mx-auto">
              {migrationSteps.map((step, i) => (
                <div key={step.step} className="flex items-stretch gap-4 flex-1">
                  <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex-1">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-lg font-bold text-indigo-400 mb-4">
                      {step.step}
                    </span>
                    <h3 className="text-base font-semibold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-zinc-400 text-center">
                      {step.description}
                    </p>
                  </div>
                  {i < migrationSteps.length - 1 && (
                    <div className="hidden sm:flex items-center">
                      <ArrowRight className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to leave the bloat behind?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                No login. No cloud. No bloat. Download ApiArk and import your
                Postman collections in under a minute.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Download className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">Download ApiArk</span>
                </a>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-zinc-200 transition-all hover:bg-white/[0.08] hover:text-white"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}
