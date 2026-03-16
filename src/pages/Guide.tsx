import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Languages, Link2, Moon, MousePointerClick, Network, RefreshCw, ShieldCheck, Search, Sun } from "lucide-react";
import docslyLogo from "@/assets/docsly-logo.png";
import docslyLogoSmall from "@/assets/docsly-logo-small.png";
import marketingEditorSurface from "@/assets/marketing-editor-surface.png";
import marketingGoogleWorkspaceSurface from "@/assets/marketing-google-workspace-surface.png";
import marketingGraphSurface from "@/assets/marketing-graph-surface.png";
import marketingPatchReviewSurface from "@/assets/marketing-patch-review-surface.png";
import marketingQueueSurface from "@/assets/marketing-queue-surface.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGuideContent } from "@/content/guideContent";
import { useI18n } from "@/i18n/useI18n";
import type { Locale } from "@/i18n/types";

const LOCALES: Locale[] = ["ko", "en"];
type GuideAudienceFilter = "all" | "advanced" | "beginner";

const Guide = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false);
  const [expandedFaqQuestion, setExpandedFaqQuestion] = useState<string | null>(null);
  const [guideAudienceFilter, setGuideAudienceFilter] = useState<GuideAudienceFilter>("all");
  const [guideQuery, setGuideQuery] = useState("");
  const guideContent = useMemo(() => getGuideContent(locale), [locale]);
  const normalizedGuideQuery = guideQuery.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    if (!normalizedGuideQuery) {
      return guideContent.guidePage.sections.filter((section) =>
        guideAudienceFilter === "all" || section.audience.includes(guideAudienceFilter));
    }

    return guideContent.guidePage.sections.filter((section) =>
      (guideAudienceFilter === "all" || section.audience.includes(guideAudienceFilter))
      && (
      [
        section.title,
        section.summary,
        ...section.bullets,
        ...(section.steps || []),
      ].some((value) => value.toLowerCase().includes(normalizedGuideQuery))
      ));
  }, [guideAudienceFilter, guideContent.guidePage.sections, normalizedGuideQuery]);

  const visibleFaqItems = useMemo(() => {
    if (!normalizedGuideQuery) {
      return guideContent.guidePage.faqItems;
    }

    return guideContent.guidePage.faqItems.filter((item) =>
      item.question.toLowerCase().includes(normalizedGuideQuery)
      || item.answer.toLowerCase().includes(normalizedGuideQuery));
  }, [guideContent.guidePage.faqItems, normalizedGuideQuery]);

  const visibleScenarioItems = useMemo(() => {
    const matchesAudience = (audience: GuideAudienceFilter, itemAudiences: ("beginner" | "advanced")[]) =>
      audience === "all" || itemAudiences.includes(audience);

    if (!normalizedGuideQuery) {
      return guideContent.guidePage.scenarioItems.filter((item) =>
        matchesAudience(guideAudienceFilter, item.audience));
    }

    return guideContent.guidePage.scenarioItems.filter((item) =>
      matchesAudience(guideAudienceFilter, item.audience)
      && [
        item.title,
        item.role,
        item.summary,
        item.caution,
        ...item.steps,
      ].some((value) => value.toLowerCase().includes(normalizedGuideQuery)));
  }, [guideAudienceFilter, guideContent.guidePage.scenarioItems, normalizedGuideQuery]);

  const hasGuideResults =
    visibleScenarioItems.length > 0 || visibleSections.length > 0 || visibleFaqItems.length > 0;
  const surfaceGallery = useMemo(() => ([
    {
      description: t("guide.currentBuildNavigatorDescription"),
      image: marketingGoogleWorkspaceSurface,
      title: t("guide.currentBuildNavigatorTitle"),
    },
    {
      description: t("guide.currentBuildReviewDescription"),
      image: marketingPatchReviewSurface,
      title: t("guide.currentBuildReviewTitle"),
    },
    {
      description: t("guide.currentBuildGraphDescription"),
      image: marketingGraphSurface,
      title: t("guide.currentBuildGraphTitle"),
    },
    {
      description: t("guide.currentBuildQueueDescription"),
      image: marketingQueueSurface,
      title: t("guide.currentBuildQueueTitle"),
    },
    {
      description: t("guide.currentBuildWorkspaceDescription"),
      image: marketingGoogleWorkspaceSurface,
      title: t("guide.currentBuildWorkspaceTitle"),
    },
    {
      description: guideContent.guidePage.visualTourDescription,
      image: marketingEditorSurface,
      title: guideContent.guidePage.visualTourTitle,
    },
  ]), [guideContent.guidePage.visualTourDescription, guideContent.guidePage.visualTourTitle, t]);
  const sectionSurfaceMap = useMemo<Record<string, { description: string; image: string; title: string }>>(() => ({
    "visual-navigator": {
      description: t("guide.currentBuildNavigatorDescription"),
      image: marketingGoogleWorkspaceSurface,
      title: t("guide.currentBuildNavigatorTitle"),
    },
    "first-document": {
      description: guideContent.guidePage.visualTourDescription,
      image: marketingEditorSurface,
      title: guideContent.guidePage.visualTourTitle,
    },
    "basic-editing": {
      description: guideContent.guidePage.visualTourDescription,
      image: marketingEditorSurface,
      title: guideContent.guidePage.visualTourTitle,
    },
    "knowledge-and-graph": {
      description: t("guide.currentBuildGraphDescription"),
      image: marketingGraphSurface,
      title: t("guide.currentBuildGraphTitle"),
    },
    "patch-review": {
      description: t("guide.currentBuildReviewDescription"),
      image: marketingPatchReviewSurface,
      title: t("guide.currentBuildReviewTitle"),
    },
    "multi-document-maintenance": {
      description: t("guide.currentBuildQueueDescription"),
      image: marketingQueueSurface,
      title: t("guide.currentBuildQueueTitle"),
    },
    "google-workspace-sync": {
      description: t("guide.currentBuildWorkspaceDescription"),
      image: marketingGoogleWorkspaceSurface,
      title: t("guide.currentBuildWorkspaceTitle"),
    },
    "operations-and-release": {
      description: t("guide.currentBuildReviewDescription"),
      image: marketingPatchReviewSurface,
      title: t("guide.currentBuildReviewTitle"),
    },
  }), [guideContent.guidePage.visualTourDescription, guideContent.guidePage.visualTourTitle, t]);
  const workflowSurfaceHighlights = useMemo(() => ([
    sectionSurfaceMap["google-workspace-sync"],
    sectionSurfaceMap["patch-review"],
  ].filter(Boolean)), [sectionSurfaceMap]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (!expandedFaqQuestion && guideContent.guidePage.faqItems.length > 0) {
      setExpandedFaqQuestion(guideContent.guidePage.faqItems[0].question);
    }
  }, [expandedFaqQuestion, guideContent.guidePage.faqItems]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/85 px-6 py-4 backdrop-blur-xl sm:px-10">
        <button
          className="flex items-center gap-2.5 rounded-md text-left outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => navigate("/")}
          type="button"
        >
          <img alt={t("common.appName")} className="h-8 w-8" src={docslyLogoSmall} />
          <div>
            <div className="text-lg font-bold tracking-tight">{t("common.appName")}</div>
            <div className="text-[11px] text-muted-foreground">{t("guide.nav")}</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Languages className="ml-1 h-4 w-4 text-muted-foreground" />
            {LOCALES.map((nextLocale) => (
              <Button
                key={nextLocale}
                className="h-7 px-2 text-xs uppercase"
                onClick={() => setLocale(nextLocale)}
                size="sm"
                variant={locale === nextLocale ? "default" : "ghost"}
              >
                {nextLocale}
              </Button>
            ))}
          </div>
          <Button className="h-8 w-8 p-0" onClick={() => setIsDark((value) => !value)} size="sm" variant="ghost">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button className="hidden gap-1.5 rounded-lg sm:inline-flex" onClick={() => navigate("/")} size="sm" variant="outline">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("guide.backToLanding")}
          </Button>
          <Button className="gap-1.5 rounded-lg" onClick={() => navigate("/editor")} size="sm">
            {t("guide.openEditor")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </nav>

      <section className="border-b border-border px-6 pb-14 pt-16 sm:px-10 sm:pt-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 inline-flex rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {guideContent.guidePage.heroEyebrow}
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                {guideContent.guidePage.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {guideContent.guidePage.heroDescription}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="gap-2 rounded-xl" onClick={() => navigate("/editor")} size="lg">
                  {t("guide.openEditor")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="rounded-xl" onClick={() => navigate("/")} size="lg" variant="outline">
                  {t("guide.backToLanding")}
                </Button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <img alt={t("common.appName")} className="h-20 w-20 sm:h-24 sm:w-24" src={docslyLogo} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {guideContent.guidePage.visualTourTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {guideContent.guidePage.visualTourDescription}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_320px] lg:items-start">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/20">
              <img
                alt={guideContent.guidePage.visualTourImageAlt}
                className="w-full"
                src={marketingEditorSurface}
              />
              {guideContent.guidePage.visualTourItems.map((item, index) => (
                <div
                  className="absolute"
                  key={item.title}
                  style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-amber-500 text-sm font-semibold text-white shadow-lg shadow-black/20">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {guideContent.guidePage.visualTourItems.map((item, index) => (
                <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4" key={item.title}>
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("guide.currentBuildTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {t("guide.currentBuildDescription")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                description: t("guide.currentBuildNavigatorDescription"),
                icon: MousePointerClick,
                title: t("guide.currentBuildNavigatorTitle"),
              },
              {
                description: t("guide.currentBuildReviewDescription"),
                icon: ShieldCheck,
                title: t("guide.currentBuildReviewTitle"),
              },
              {
                description: t("guide.currentBuildGraphDescription"),
                icon: Network,
                title: t("guide.currentBuildGraphTitle"),
              },
              {
                description: t("guide.currentBuildQueueDescription"),
                icon: RefreshCw,
                title: t("guide.currentBuildQueueTitle"),
              },
              {
                description: t("guide.currentBuildWorkspaceDescription"),
                icon: Link2,
                title: t("guide.currentBuildWorkspaceTitle"),
              },
            ].map(({ description, icon: Icon, title }) => (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-5" key={title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("guide.surfaceGalleryTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {t("guide.surfaceGalleryDescription")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {surfaceGallery.map(({ description, image, title }) => (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20" key={title}>
                <div className="aspect-[16/10] overflow-hidden border-b border-border/70 bg-background">
                  <img alt={title} className="h-full w-full object-cover object-top" loading="lazy" src={image} />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("guide.workspaceFlowTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {t("guide.workspaceFlowDescription")}
            </p>
          </div>

          <div className="mb-6 grid gap-5 md:grid-cols-2">
            {workflowSurfaceHighlights.map((surface) => (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20" key={surface.title}>
                <div className="aspect-[16/10] overflow-hidden border-b border-border/70 bg-background">
                  <img
                    alt={surface.title}
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                    src={surface.image}
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-foreground">{surface.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{surface.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <ol className="space-y-3">
              {[
                t("guide.workspaceFlowStepConnect"),
                t("guide.workspaceFlowStepRescan"),
                t("guide.workspaceFlowStepExport"),
                t("guide.workspaceFlowStepSave"),
                t("guide.workspaceFlowStepConflict"),
                t("guide.workspaceFlowStepWarnings"),
              ].map((step, index) => (
                <li className="flex gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4" key={step}>
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-6 text-foreground">{step}</span>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 text-sm leading-6 text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t("guide.currentBuildWorkspaceTitle")}
              </div>
              <p className="mt-2">
                {t("guide.currentBuildWorkspaceDescription")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {guideContent.guidePage.scenarioTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {guideContent.guidePage.scenarioDescription}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleScenarioItems.map((item) => (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-5" key={item.title}>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.role}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                <ol className="mt-4 space-y-2">
                  {item.steps.map((step, index) => (
                    <li className="flex gap-3" key={`${item.title}-${index}`}>
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                        {index + 1}
                      </span>
                      <span className="text-sm leading-6 text-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                  {item.caution}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="text-sm font-semibold text-foreground">{t("guide.searchTitle")}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("guide.searchDescription")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["all", "beginner", "advanced"] as const).map((audience) => (
                <Button
                  className="h-8 rounded-full px-3 text-xs"
                  key={audience}
                  onClick={() => setGuideAudienceFilter(audience)}
                  size="sm"
                  type="button"
                  variant={guideAudienceFilter === audience ? "secondary" : "outline"}
                >
                  {t(`guide.audience${audience.charAt(0).toUpperCase()}${audience.slice(1)}` as const)}
                </Button>
              ))}
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-11 pl-10 text-sm"
                onChange={(event) => setGuideQuery(event.target.value)}
                placeholder={t("guide.searchPlaceholder")}
                value={guideQuery}
              />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">{t("guide.tableOfContents")}</h2>
              {visibleSections.length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  {visibleSections.map((section, index) => (
                    <a
                      className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                      href={`#${section.id}`}
                      key={section.id}
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <span>{section.title}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("guide.noResults")}</p>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">{guideContent.guidePage.recommendedPathTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {guideContent.guidePage.recommendedPathDescription}
              </p>
              <ol className="mt-4 space-y-2">
                {guideContent.guidePage.recommendedPathSteps.map((step, index) => (
                  <li className="flex gap-3" key={`${step}-${index}`}>
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-6 text-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="space-y-5">
            {hasGuideResults ? (
              <>
                {visibleSections.map((section, index) => (
                  <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" id={section.id} key={section.id}>
                    {sectionSurfaceMap[section.id] && (
                      <div className="mb-5 overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                        <div className="aspect-[16/9] overflow-hidden border-b border-border/70 bg-background">
                          <img
                            alt={sectionSurfaceMap[section.id].title}
                            className="h-full w-full object-cover object-top"
                            loading="lazy"
                            src={sectionSurfaceMap[section.id].image}
                          />
                        </div>
                        <div className="px-4 py-3">
                          <div className="text-sm font-semibold text-foreground">{sectionSurfaceMap[section.id].title}</div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {sectionSurfaceMap[section.id].description}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold tracking-tight text-foreground">{section.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                          {section.summary}
                        </p>
                      </div>
                    </div>

                    {section.steps && section.steps.length > 0 && (
                      <ol className="mt-5 space-y-3">
                        {section.steps.map((step, stepIndex) => (
                          <li className="flex gap-3" key={`${section.id}-step-${stepIndex}`}>
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                              {stepIndex + 1}
                            </span>
                            <span className="pt-0.5 text-sm leading-6 text-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                      {section.bullets.map((bullet) => (
                        <li className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6 text-muted-foreground" key={bullet}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}

                {visibleFaqItems.length > 0 && (
                  <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">{guideContent.guidePage.faqTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                      {guideContent.guidePage.faqDescription}
                    </p>
                    <div className="mt-5 space-y-3">
                      {visibleFaqItems.map((item) => {
                        const isExpanded = expandedFaqQuestion === item.question;

                        return (
                          <div className="rounded-xl border border-border/70 bg-muted/20" key={item.question}>
                            <button
                              aria-expanded={isExpanded}
                              className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
                              onClick={() => setExpandedFaqQuestion(isExpanded ? null : item.question)}
                              type="button"
                            >
                              <span className="text-sm font-semibold leading-6 text-foreground">{item.question}</span>
                              {isExpanded ? (
                                <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                            </button>
                            {isExpanded && (
                              <p className="border-t border-border/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
                                {item.answer}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section className="rounded-2xl border border-dashed border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">{t("guide.noResults")}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("guide.searchDescription")}
                </p>
              </section>
            )}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
};

export default Guide;
