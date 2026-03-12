import { Link } from "react-router-dom";
import docslyLogoSmall from "@/assets/docsly-logo-small.png";

const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-2" to="/">
          <img alt="Docsy" className="h-8 w-8" src={docslyLogoSmall} />
          <span className="text-lg font-semibold tracking-tight">Docsy</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link className="transition-colors hover:text-foreground" to="/terms">Terms</Link>
          <Link className="transition-colors hover:text-foreground" to="/editor">Open editor</Link>
        </nav>
      </div>
    </header>

    <main className="px-6 py-14">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent px-8 py-10">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Privacy Policy
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Docsy Privacy Policy</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Effective date: March 13, 2026. This policy explains what data Docsy processes, why it is used,
            and how Google Workspace data is handled when you connect your account.
          </p>
        </div>

        <div className="space-y-10 px-8 py-10 text-sm leading-7 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold">What Docsy does</h2>
            <p className="mt-3">
              Docsy is a document editor that supports Markdown, LaTeX, HTML, and Google Workspace import,
              export, and synchronization features. When you choose to connect Google Workspace, Docsy uses
              Google OAuth to access the files and document metadata needed to complete the actions you request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Information we process</h2>
            <p className="mt-3">
              Docsy may process account profile details provided by Google, including your name, email address,
              profile image, and Google account identifier. If you connect Google Workspace, Docsy may also
              process Google Drive file metadata, Google Docs document content, revision identifiers, and sync
              status information needed to import, export, or update documents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">How Google Workspace data is used</h2>
            <p className="mt-3">
              Google Workspace data is used only to provide the features you trigger, such as listing files,
              importing selected documents, exporting content to Google Docs, and synchronizing linked files.
              Docsy does not use Google Workspace data for advertising or for unrelated profiling.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Storage and retention</h2>
            <p className="mt-3">
              OAuth tokens and workspace connection state may be stored on the Docsy server to keep your session
              active and to support document sync workflows. Imported or exported document content is retained
              only as needed to provide the editing and synchronization features you use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Sharing</h2>
            <p className="mt-3">
              Docsy does not sell your personal information. Data is shared only with service providers or
              infrastructure systems required to operate the application, or when disclosure is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Your choices</h2>
            <p className="mt-3">
              You can disconnect your Google Workspace account from within the application at any time. You can
              also revoke Docsy access from your Google account permissions page. If you want account or data
              deletion assistance, contact the support address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="mt-3">
              For privacy questions or deletion requests, contact:
              {" "}
              <a className="font-medium text-sky-700 underline underline-offset-4 dark:text-sky-300" href="mailto:dailykim149656@gmail.com">
                dailykim149656@gmail.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </main>
  </div>
);

export default Privacy;
