"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* Header */}
          <motion.div variants={fadeIn} className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Privacy Policy
            </h1>
            <p className="text-sm text-zinc-500">
              Last updated: March 2026
            </p>
            <p className="text-lg text-zinc-400">
              ApiArk is built on a simple principle: your data is yours. We
              collect nothing by default.
            </p>
          </motion.div>

          {/* Zero Data Collection */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Zero Data Collection by Default
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              ApiArk collects absolutely nothing out of the box. There is no
              analytics, no tracking, no fingerprinting, no usage metrics, and
              no telemetry. We do not use any third-party SDKs that phone
              home&mdash;no Google Analytics, no Mixpanel, no Segment, no
              Sentry SaaS.
            </p>
          </motion.section>

          {/* Local-First */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Your Data Stays Local
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              All user data remains on your local filesystem at all times:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-zinc-400">
              <li>Collections and environments are stored as plain YAML files</li>
              <li>Secrets are stored in standard <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-300">.env</code> files</li>
              <li>History and settings are stored in a local SQLite database and JSON files</li>
              <li>Nothing is uploaded anywhere unless you explicitly use Git push, export, or webhook features</li>
            </ul>
          </motion.section>

          {/* Opt-In Crash Reports */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Opt-In Crash Reports
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              On first launch, a non-modal banner asks if you&apos;d like to
              help improve ApiArk by sending anonymous crash reports. The
              default is <strong className="text-zinc-300">No</strong>.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              If you opt in, crash reports contain only: stack trace, OS
              version, and app version. They <strong className="text-zinc-300">never</strong> contain
              request URLs, headers, bodies, environment variables, or secrets.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Crash reports are stored locally in{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-300">
                ~/.apiark/crash-reports/
              </code>{" "}
              as JSON files. You can inspect or delete them at any time.
            </p>
          </motion.section>

          {/* No License Validation */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              No License Validation
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              ApiArk is 100% free. There are no license keys, no subscription
              checks, and no phone-home calls. Every feature works fully
              offline without any validation.
            </p>
          </motion.section>

          {/* No Third Parties */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              No Third-Party Services
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              ApiArk does not integrate with any third-party data collection or
              analytics services. The only external connections ApiArk makes
              are:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-zinc-400">
              <li>API requests you explicitly send (your intent)</li>
              <li>OAuth flows you initiate</li>
              <li>Update checks against our release server</li>
              <li>Update checks against our release server</li>
            </ul>
          </motion.section>

          {/* Data Deletion */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Data Deletion
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              To completely remove all ApiArk data from your machine, uninstall
              the application and delete the{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-300">
                ~/.apiark/
              </code>{" "}
              directory. That&apos;s it. There is no cloud account to close, no
              remote data to request deletion of.
            </p>
          </motion.section>

          {/* GDPR */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              GDPR Compliance
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              ApiArk is compliant with GDPR by design. No personal data is
              processed unless you explicitly opt in to crash reporting. The
              license validation endpoint is hosted in the EU.
            </p>
          </motion.section>

          {/* Contact */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Contact</h2>
            <p className="text-zinc-400 leading-relaxed">
              If you have questions about this privacy policy, contact us at{" "}
              <a
                href="mailto:privacy@apiark.dev"
                className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300"
              >
                privacy@apiark.dev
              </a>
              .
            </p>
          </motion.section>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
