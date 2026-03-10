import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Code2,
  FileCode,
  FileJson,
  FileText,
  Languages,
  Layout,
  Moon,
  Printer,
  Shield,
  Sparkles,
  Sun,
  Table,
  Zap,
} from "lucide-react";
import docslyLogo from "@/assets/docsly-logo.png";
import docslyLogoSmall from "@/assets/docsly-logo-small.png";
import editorPreview from "@/assets/editor-preview.png";
import editorPreviewSmall from "@/assets/editor-preview-small.png";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import type { Locale } from "@/i18n/types";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (index: number = 0) => ({
    opacity: 1,
    transition: { delay: index * 0.12, duration: 0.6, ease: "easeOut" as const },
    y: 0,
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const featureColors = [
  "from-amber-500/20 to-orange-500/20 dark:from-amber-500/10 dark:to-orange-500/10",
  "from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10",
  "from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/10 dark:to-teal-500/10",
  "from-purple-500/20 to-violet-500/20 dark:from-purple-500/10 dark:to-violet-500/10",
  "from-rose-500/20 to-pink-500/20 dark:from-rose-500/10 dark:to-pink-500/10",
  "from-sky-500/20 to-indigo-500/20 dark:from-sky-500/10 dark:to-indigo-500/10",
  "from-lime-500/20 to-green-500/20 dark:from-lime-500/10 dark:to-green-500/10",
  "from-orange-500/20 to-red-500/20 dark:from-orange-500/10 dark:to-red-500/10",
  "from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10",
];

const iconColors = [
  "text-amber-600 dark:text-amber-400",
  "text-blue-600 dark:text-blue-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-purple-600 dark:text-purple-400",
  "text-rose-600 dark:text-rose-400",
  "text-sky-600 dark:text-sky-400",
  "text-lime-600 dark:text-lime-400",
  "text-orange-600 dark:text-orange-400",
  "text-indigo-600 dark:text-indigo-400",
];

const LOCALES: Locale[] = ["ko", "en"];

const Landing = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const [isDark, setIsDark] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const features = useMemo(() => ([
    { description: t("landing.features.markdownDesc"), icon: FileText, title: t("landing.features.markdownTitle") },
    { description: t("landing.features.latexDesc"), icon: Code2, title: t("landing.features.latexTitle") },
    { description: t("landing.features.rstDesc"), icon: FileCode, title: t("landing.features.rstTitle") },
    { description: t("landing.features.htmlDesc"), icon: Layout, title: t("landing.features.htmlTitle") },
    { description: t("landing.features.jsonDesc"), icon: FileJson, title: t("landing.features.jsonTitle") },
    { description: t("landing.features.tableDesc"), icon: Table, title: t("landing.features.tableTitle") },
    { description: t("landing.features.templateDesc"), icon: BookOpen, title: t("landing.features.templateTitle") },
    { description: t("landing.features.exportDesc"), icon: Printer, title: t("landing.features.exportTitle") },
    { description: t("landing.features.themeDesc"), icon: Moon, title: t("landing.features.themeTitle") },
  ]), [t]);

  const formats = ["Markdown", "LaTeX", "HTML", "Typst", "RST", "AsciiDoc", "JSON", "YAML", "PDF"];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <motion.nav
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-xl sm:px-10"
        initial={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5">
          <img alt={t("common.appName")} className="h-8 w-8" src={docslyLogoSmall} />
          <span className="text-lg font-bold tracking-tight">{t("common.appName")}</span>
        </div>
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
          <Button className="gap-1.5 rounded-lg" onClick={() => navigate("/editor")} size="sm">
            {t("landing.openEditor")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.nav>

      <motion.section
        className="relative flex flex-col items-center justify-center px-6 pb-8 pt-20 text-center sm:pt-28"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-20 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-transparent blur-3xl" />
        </div>

        <motion.div
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          className="relative mb-8"
          initial={{ opacity: 0, rotate: -10, scale: 0.6 }}
          transition={{ bounce: 0.4, duration: 0.7, type: "spring" }}
        >
          <img alt="Docsy mascot" className="h-24 w-24 drop-shadow-xl sm:h-32 sm:w-32" src={docslyLogo} />
          <motion.div
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            className="absolute -right-1 -top-1 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 shadow-lg"
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
        </motion.div>

        <motion.h1
          animate="visible"
          className="max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          custom={1}
          initial="hidden"
          variants={fadeUp}
        >
          {t("landing.hero.titleLead")}{" "}
          <span className="relative">
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              {t("landing.hero.titleAccent")}
            </span>
            <motion.span
              animate={{ scaleX: 1 }}
              className="absolute -bottom-1 left-0 right-0 h-1 origin-left rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ scaleX: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
            />
          </span>
        </motion.h1>

        <motion.p
          animate="visible"
          className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          custom={2}
          initial="hidden"
          variants={fadeUp}
        >
          {t("landing.hero.description")}
        </motion.p>

        <motion.div
          animate="visible"
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          custom={3}
          initial="hidden"
          variants={fadeUp}
        >
          <Button
            className="gap-2 rounded-xl border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 text-base text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600 hover:shadow-xl"
            onClick={() => navigate("/editor")}
            size="lg"
          >
            {t("landing.hero.primaryCta")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            className="rounded-xl px-8 py-6 text-base transition-all hover:-translate-y-0.5"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            size="lg"
            variant="outline"
          >
            {t("landing.hero.secondaryCta")}
          </Button>
        </motion.div>

        <motion.div
          animate="visible"
          className="mt-8 flex items-center gap-6 text-sm text-muted-foreground"
          custom={4}
          initial="hidden"
          variants={fadeUp}
        >
          <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> {t("landing.hero.free")}</span>
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> {t("landing.hero.autosave")}</span>
          <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> {t("landing.hero.localFirst")}</span>
        </motion.div>
      </motion.section>

      <motion.section
        className="px-6 pb-20 pt-4 sm:px-10"
        custom={0}
        initial="hidden"
        variants={fadeUp}
        viewport={{ margin: "-50px", once: true }}
        whileInView="visible"
      >
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 dark:shadow-black/30"
            transition={{ duration: 0.3 }}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="ml-2 text-xs text-muted-foreground">docsy.app/editor</span>
            </div>
            <img
              alt={t("landing.previewAlt")}
              className="w-full"
              loading="lazy"
              sizes="(max-width: 1024px) 960px, 1280px"
              src={editorPreviewSmall}
              srcSet={`${editorPreviewSmall} 960w, ${editorPreview} 1280w`}
            />
          </motion.div>
        </div>
      </motion.section>

      <section className="border-y border-border bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-6">
          <motion.p
            className="mb-6 text-center text-sm text-muted-foreground"
            initial="hidden"
            variants={fadeUp}
            viewport={{ once: true }}
            whileInView="visible"
          >
            {t("landing.supportedFormats")}
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3"
            initial="hidden"
            variants={staggerContainer}
            viewport={{ once: true }}
            whileInView="visible"
          >
            {formats.map((format, index) => (
              <motion.span
                key={format}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                custom={index}
                variants={fadeUp}
              >
                {format}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10" id="features">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            variants={fadeUp}
            viewport={{ margin: "-80px", once: true }}
            whileInView="visible"
          >
            <span className="mb-4 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              {t("landing.featuresBadge")}
            </span>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{t("landing.featuresTitle")}</h2>
            <p className="mx-auto max-w-lg text-lg text-muted-foreground">{t("landing.featuresDescription")}</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            variants={staggerContainer}
            viewport={{ margin: "-60px", once: true }}
            whileInView="visible"
          >
            {features.map(({ description, icon: Icon, title }, index) => (
              <motion.div
                key={title}
                className="group cursor-default rounded-2xl border border-border bg-card p-6 transition-all hover:border-border/80 hover:shadow-lg"
                custom={index}
                transition={{ duration: 0.2 }}
                variants={fadeUp}
                whileHover={{ y: -6 }}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${featureColors[index]} transition-transform group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${iconColors[index]}`} />
                </div>
                <h3 className="mb-2 text-base font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10">
        <motion.div
          className="relative mx-auto max-w-3xl text-center"
          initial="hidden"
          variants={fadeUp}
          viewport={{ margin: "-80px", once: true }}
          whileInView="visible"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 blur-2xl" />
          <div className="relative rounded-3xl border border-border bg-card px-8 py-16 shadow-sm sm:px-16">
            <motion.img
              alt={t("common.appName")}
              className="mx-auto mb-6 h-16 w-16"
              src={docslyLogo}
              transition={{ duration: 0.5 }}
              whileHover={{ rotate: [0, -10, 10, 0] }}
            />
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">{t("landing.ctaTitle")}</h2>
            <p className="mx-auto mb-8 max-w-md text-muted-foreground">{t("landing.ctaDescription")}</p>
            <Button
              className="gap-2 rounded-xl border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 text-base text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600 hover:shadow-xl"
              onClick={() => navigate("/editor")}
              size="lg"
            >
              {t("landing.openEditor")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <img alt={t("common.appName")} className="h-5 w-5" src={docslyLogoSmall} />
          <span className="text-sm font-semibold">{t("common.appName")}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t("landing.footer")}</p>
      </footer>
    </div>
  );
};

export default Landing;
