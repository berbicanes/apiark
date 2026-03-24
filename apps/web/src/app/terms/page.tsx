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

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>
            <p className="text-sm text-zinc-500">
              Last updated: March 2026
            </p>
            <p className="text-lg text-zinc-400">
              By using ApiArk, you agree to the following terms. They are
              straightforward.
            </p>
          </motion.div>

          {/* Open Source License */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Open Source Core
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              The core of ApiArk is open source and licensed under the{" "}
              <strong className="text-zinc-300">MIT License</strong>. You are
              free to use, modify, and distribute the open-source core in
              accordance with the MIT License terms. The full license text is
              available in the{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-300">
                LICENSE
              </code>{" "}
              file in the repository.
            </p>
          </motion.section>

          {/* Free Forever */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              All Features Free
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              Every feature in ApiArk is free — mock servers, scheduled testing,
              API documentation generation, response diff, collection runner,
              and all protocols. No tiers, no paywalls, no upsells.
            </p>
          </motion.section>

          {/* Your Data */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Your Data is Yours
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              ApiArk does not store, transmit, or have access to your API data.
              All collections, environments, secrets, and history remain on your
              local filesystem. You are solely responsible for the security of
              your API keys, tokens, and credentials.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              We strongly recommend using{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-300">
                .env
              </code>{" "}
              files for secrets and adding them to your{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-300">
                .gitignore
              </code>{" "}
              to prevent accidental commits.
            </p>
          </motion.section>

          {/* No Warranty */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              No Warranty
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              ApiArk is provided &quot;as is&quot; and &quot;as
              available&quot; without warranty of any kind, express or implied,
              including but not limited to the warranties of merchantability,
              fitness for a particular purpose, and non-infringement.
            </p>
          </motion.section>

          {/* Limitation of Liability */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Limitation of Liability
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              In no event shall the authors or copyright holders of ApiArk be
              liable for any claim, damages, or other liability, whether in an
              action of contract, tort, or otherwise, arising from, out of, or
              in connection with the software or the use or other dealings in
              the software.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              You acknowledge that ApiArk is a development tool and that you
              are responsible for testing and validating API integrations in
              your own environments. ApiArk is not liable for data loss,
              security breaches, or any damages resulting from your use of the
              software.
            </p>
          </motion.section>

          {/* User Responsibilities */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              User Responsibilities
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-zinc-400">
              <li>
                You are responsible for safeguarding your API keys, tokens, and
                credentials
              </li>
              <li>
                You are responsible for ensuring your use of APIs complies with
                their respective terms of service
              </li>
              <li>
                You must not use ApiArk to conduct unauthorized testing or
                attacks against APIs or services you do not own or have
                permission to test
              </li>
              <li>
                You are responsible for maintaining backups of your collection
                files
              </li>
            </ul>
          </motion.section>

          {/* Termination */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Termination
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              You may stop using ApiArk at any time. There is no account to
              delete, no cancellation process, and no data held hostage. Your
              collections are standard YAML files on your filesystem. Your
              history is a local SQLite database. Uninstall the app and your
              relationship with ApiArk is over.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              If you hold a Pro or Team license, you may cancel your
              subscription at any time. Cancellation stops future billing but
              does not entitle you to a refund for the current billing period.
              Your data remains on your machine regardless of subscription
              status.
            </p>
          </motion.section>

          {/* Changes */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Changes to These Terms
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              We may update these terms from time to time. Changes will be
              posted on this page with an updated date. Continued use of
              ApiArk after changes constitutes acceptance of the new terms.
            </p>
          </motion.section>

          {/* Contact */}
          <motion.section variants={fadeIn} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Contact</h2>
            <p className="text-zinc-400 leading-relaxed">
              If you have questions about these terms, contact us at{" "}
              <a
                href="mailto:legal@apiark.dev"
                className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300"
              >
                legal@apiark.dev
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
