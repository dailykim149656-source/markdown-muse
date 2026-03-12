import { Link } from "react-router-dom";
import docslyLogoSmall from "@/assets/docsly-logo-small.png";

const Terms = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-2" to="/">
          <img alt="Docsy" className="h-8 w-8" src={docslyLogoSmall} />
          <span className="text-lg font-semibold tracking-tight">Docsy</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link className="transition-colors hover:text-foreground" to="/privacy">Privacy</Link>
          <Link className="transition-colors hover:text-foreground" to="/editor">Open editor</Link>
        </nav>
      </div>
    </header>

    <main className="px-6 py-14">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent px-8 py-10">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            Terms of Service
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Docsy Terms of Service</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Effective date: March 13, 2026. These terms govern access to and use of the Docsy editor and its
            Google Workspace integration features.
          </p>
        </div>

        <div className="space-y-10 px-8 py-10 text-sm leading-7 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold">Use of the service</h2>
            <p className="mt-3">
              You may use Docsy only in compliance with applicable law and these terms. You are responsible for
              the documents, prompts, and external accounts you connect to the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Google Workspace connection</h2>
            <p className="mt-3">
              If you connect a Google account, you authorize Docsy to access the Google Drive and Google Docs
              scopes necessary for the import, export, and synchronization features you choose to use. You are
              responsible for ensuring that you have permission to access and modify the files you connect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Acceptable use</h2>
            <p className="mt-3">
              You may not use Docsy to violate the rights of others, distribute malicious content, interfere with
              the service, or attempt unauthorized access to systems, data, or accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Intellectual property</h2>
            <p className="mt-3">
              You retain ownership of the content you create or connect through Docsy. The Docsy application,
              branding, and related software remain the property of their respective owner.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Service availability</h2>
            <p className="mt-3">
              Docsy is provided on an as-is basis. Features may change, be interrupted, or be removed without
              notice. No guarantee is made that the service will be uninterrupted, error-free, or suitable for
              every workflow.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Limitation of liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by law, Docsy is not liable for indirect, incidental, special,
              consequential, or exemplary damages arising from your use of the service, including data loss,
              business interruption, or document synchronization issues.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Changes and contact</h2>
            <p className="mt-3">
              These terms may be updated from time to time. Continued use of Docsy after an update means the
              revised terms apply. Questions can be sent to
              {" "}
              <a className="font-medium text-sky-700 underline underline-offset-4 dark:text-sky-300" href="mailto:dailykim149656@gmail.com">
                dailykim149656@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  </div>
);

export default Terms;
