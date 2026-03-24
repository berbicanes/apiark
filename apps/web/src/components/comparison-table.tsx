"use client";

import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

type CellValue =
  | { type: "yes" }
  | { type: "no" }
  | { type: "partial"; label?: string }
  | { type: "text"; label: string };

function CellIcon({ value }: { value: CellValue }) {
  switch (value.type) {
    case "yes":
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10">
          <Check className="w-3 h-3 text-emerald-400" />
        </span>
      );
    case "no":
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10">
          <X className="w-3 h-3 text-red-400" />
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10">
            <Minus className="w-3 h-3 text-amber-400" />
          </span>
          {value.label && (
            <span className="text-[11px] text-amber-400/70">{value.label}</span>
          )}
        </span>
      );
    case "text":
      return <span className="text-[13px] text-zinc-400">{value.label}</span>;
  }
}

const yes: CellValue = { type: "yes" };
const no: CellValue = { type: "no" };
const partial = (label?: string): CellValue => ({ type: "partial", label });
const text = (label: string): CellValue => ({ type: "text", label });

interface ComparisonRow {
  feature: string;
  apiark: CellValue;
  postman: CellValue;
  bruno: CellValue;
  insomnia: CellValue;
  hoppscotch: CellValue;
}

const rows: ComparisonRow[] = [
  {
    feature: "Framework",
    apiark: text("Tauri v2"),
    postman: text("Electron"),
    bruno: text("Electron"),
    insomnia: text("Electron"),
    hoppscotch: text("Tauri"),
  },
  {
    feature: "RAM Usage",
    apiark: text("~50MB"),
    postman: text("300-800MB"),
    bruno: text("150-300MB"),
    insomnia: text("200-400MB"),
    hoppscotch: text("50-80MB"),
  },
  {
    feature: "Account Required",
    apiark: no,
    postman: yes,
    bruno: no,
    insomnia: partial("Optional"),
    hoppscotch: partial("Optional"),
  },
  {
    feature: "Data Storage",
    apiark: text("Filesystem"),
    postman: text("Cloud"),
    bruno: text("Filesystem"),
    insomnia: text("Cloud"),
    hoppscotch: text("IndexedDB"),
  },
  {
    feature: "REST",
    apiark: yes,
    postman: yes,
    bruno: yes,
    insomnia: yes,
    hoppscotch: yes,
  },
  {
    feature: "GraphQL",
    apiark: yes,
    postman: yes,
    bruno: yes,
    insomnia: yes,
    hoppscotch: yes,
  },
  {
    feature: "gRPC",
    apiark: yes,
    postman: yes,
    bruno: yes,
    insomnia: yes,
    hoppscotch: no,
  },
  {
    feature: "WebSocket",
    apiark: yes,
    postman: yes,
    bruno: no,
    insomnia: yes,
    hoppscotch: yes,
  },
  {
    feature: "SSE",
    apiark: yes,
    postman: yes,
    bruno: no,
    insomnia: yes,
    hoppscotch: yes,
  },
  {
    feature: "MQTT",
    apiark: yes,
    postman: no,
    bruno: no,
    insomnia: no,
    hoppscotch: no,
  },
  {
    feature: "Mock Servers",
    apiark: yes,
    postman: partial("Cloud only"),
    bruno: no,
    insomnia: partial("Basic"),
    hoppscotch: no,
  },
  {
    feature: "Monitoring",
    apiark: yes,
    postman: partial("Cloud only"),
    bruno: no,
    insomnia: no,
    hoppscotch: no,
  },
  {
    feature: "Collection Runner",
    apiark: yes,
    postman: yes,
    bruno: no,
    insomnia: no,
    hoppscotch: no,
  },
  {
    feature: "CLI Tool",
    apiark: yes,
    postman: text("Newman"),
    bruno: text("bru CLI"),
    insomnia: text("inso"),
    hoppscotch: text("hopp"),
  },
  {
    feature: "Plugin System",
    apiark: yes,
    postman: no,
    bruno: no,
    insomnia: partial("npm"),
    hoppscotch: no,
  },
  {
    feature: "Open Source",
    apiark: text("MIT"),
    postman: no,
    bruno: text("MIT"),
    insomnia: text("MIT"),
    hoppscotch: text("MIT"),
  },
  {
    feature: "Price",
    apiark: text("Free forever"),
    postman: text("$19/user/mo"),
    bruno: text("$6/user/mo"),
    insomnia: text("$12/user/mo"),
    hoppscotch: text("Custom"),
  },
];

const competitors = ["apiark", "postman", "bruno", "insomnia", "hoppscotch"] as const;

const competitorLabels: Record<(typeof competitors)[number], string> = {
  apiark: "ApiArk",
  postman: "Postman",
  bruno: "Bruno",
  insomnia: "Insomnia",
  hoppscotch: "Hoppscotch",
};

const detailedLinks = [
  { name: "Postman", href: "/compare/postman" },
  { name: "Bruno", href: "/compare/bruno" },
  { name: "Insomnia", href: "/compare/insomnia" },
  { name: "Hoppscotch", href: "/compare/hoppscotch" },
];

export default function ComparisonTable() {
  return (
    <section id="compare" className="relative py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="mb-16"
        >
          <p className="section-label mb-4">_compare</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            See how we compare.
          </h2>
          <p className="mt-3 text-base text-zinc-500 max-w-xl">
            Every feature. Every competitor. No asterisks.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="sticky left-0 z-20 bg-[#0d0d0f] px-5 py-3.5 text-[13px] font-medium text-zinc-500 w-44 min-w-[176px]">
                    Feature
                  </th>
                  {competitors.map((key) => (
                    <th
                      key={key}
                      className={`px-5 py-3.5 text-[13px] font-semibold text-center min-w-[120px] ${
                        key === "apiark"
                          ? "bg-indigo-500/[0.06] text-indigo-300"
                          : "text-zinc-400"
                      }`}
                    >
                      {key === "apiark" && (
                        <span className="block text-[9px] uppercase tracking-widest text-indigo-400/70 mb-0.5 font-mono">
                          ours
                        </span>
                      )}
                      {competitorLabels[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${
                      i % 2 === 0 ? "bg-transparent" : "bg-white/[0.008]"
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-[#0d0d0f] px-5 py-3 text-[13px] font-medium text-zinc-400 w-44 min-w-[176px]">
                      <span className="relative">
                        {row.feature}
                        <span
                          className={`absolute inset-0 -z-10 -mx-5 -my-3 px-5 py-3 ${
                            i % 2 !== 0 ? "bg-white/[0.008]" : ""
                          }`}
                        />
                      </span>
                    </td>
                    {competitors.map((key) => (
                      <td
                        key={key}
                        className={`px-5 py-3 text-center ${
                          key === "apiark" ? "bg-indigo-500/[0.04]" : ""
                        }`}
                      >
                        <span className="inline-flex justify-center">
                          <CellIcon value={row[key]} />
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Detailed comparison links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 text-center"
        >
          <span className="text-sm text-zinc-600 font-mono">_detailed: </span>
          {detailedLinks.map((link, i) => (
            <span key={link.name}>
              <a
                href={link.href}
                className="text-sm text-indigo-400/80 hover:text-indigo-300 transition-colors"
              >
                {link.name}
              </a>
              {i < detailedLinks.length - 1 && (
                <span className="text-zinc-700 mx-2">/</span>
              )}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
