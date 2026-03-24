"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Download } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const features = [
  "Unlimited collections & environments",
  "Full scripting engine (JS/TS)",
  "REST, GraphQL, gRPC, WebSocket, SSE, MQTT",
  "Import from Postman, Bruno, Insomnia, OpenAPI",
  "Export to Postman, OpenAPI, cURL, HAR",
  "CLI tool (apiark run, import, export)",
  "Request history & search",
  "OAuth 2.0, Digest, AWS Sig v4, NTLM, JWT",
  "Collection runner with data-driven testing",
  "Cookie jar management",
  "Code generation (JS, Python, cURL)",
  "Mock servers (unlimited, local)",
  "Scheduled testing & monitors",
  "API documentation generation",
  "Response diff viewer",
  "OpenAPI spec editor with linting",
  "Parallel collection runner",
  "Proxy capture mode",
  "Built-in Git UI",
  "Team environment sharing",
  "SSO / SAML authentication",
  "Audit logs",
];

const faqs = [
  {
    question: "Is ApiArk really free?",
    answer:
      "Yes. Every feature is free with no usage limits, no account required, and no time restrictions. We believe great developer tools should be accessible to everyone.",
  },
  {
    question: "How do you sustain the project?",
    answer:
      "ApiArk is open source (MIT) and community-driven. We sustain the project through community contributions and sponsorships. Every feature is and will always be free.",
  },
  {
    question: "Can I use ApiArk offline?",
    answer:
      "Absolutely. ApiArk is designed to work 100% offline for all workflows. Collections, environments, scripting, history, mock servers, and the collection runner all work without an internet connection.",
  },
  {
    question: "Can I switch from Postman easily?",
    answer:
      "Yes — ApiArk has a built-in Postman importer. Export your Postman collection as JSON, then import it into ApiArk. Collections, environments, headers, auth, scripts, and tests are all converted. The entire process takes less than 60 seconds.",
  },
  {
    question: "Will there ever be paid features?",
    answer:
      "No. ApiArk is and will always be 100% free. Every feature, every protocol, every tool — no paywalls, no tiers, no upsells. Ever.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-white"
      >
        <span className="text-base font-medium text-zinc-200 pr-4">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-zinc-400">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen pt-32 pb-24">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="font-mono text-sm text-indigo-400 mb-4">
              _pricing
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white"
            >
              Free. Forever. No catches.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto"
            >
              Every feature. Every protocol. No account. No limits.
              Just download and build.
            </motion.p>
          </motion.div>

          {/* Single pricing card */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="max-w-2xl mx-auto"
          >
            <motion.div
              variants={fadeUp}
              className="relative rounded-2xl border border-indigo-500/20 bg-white/[0.02] p-8 sm:p-10"
            >
              {/* Glow */}
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-indigo-500/10 to-transparent opacity-50" />

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white">ApiArk</h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      The complete API development platform
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold text-white">$0</span>
                    <span className="text-sm text-zinc-500 ml-1">forever</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-8">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-sm text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="/download"
                  className="flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download — It&apos;s Free
                </a>

                <p className="text-center text-xs text-zinc-600 mt-3">
                  No account. No credit card. No telemetry.
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mt-32 max-w-2xl mx-auto"
          >
            <p className="font-mono text-sm text-indigo-400 mb-3 text-center">
              _faq
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-white">
              Frequently asked questions
            </h2>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6">
              {faqs.map((faq, i) => (
                <FaqItem
                  key={i}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}
