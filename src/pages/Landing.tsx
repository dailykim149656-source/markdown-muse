import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Code2, Printer, Moon, Sun, Sparkles, Zap, Shield, FileCode, FileJson, Table, Layout, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import docslyLogo from "@/assets/docsly-logo.png";
import editorPreview from "@/assets/editor-preview.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] },
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

const Landing = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const features = [
    { icon: FileText, title: "Markdown WYSIWYG", desc: "마크다운 문법을 몰라도 괜찮아요. 보이는 그대로 편집하고, 깔끔한 .md 파일로 저장하세요." },
    { icon: Code2, title: "LaTeX & Typst", desc: "수식이 포함된 학술 문서를 LaTeX 또는 Typst로 작성하고 실시간 미리보기로 확인하세요." },
    { icon: FileCode, title: "RST & AsciiDoc", desc: "reStructuredText와 AsciiDoc 형식을 지원해요. 가져오기와 내보내기 모두 가능합니다." },
    { icon: Layout, title: "HTML 편집기", desc: "HTML 문서를 WYSIWYG으로 편집하고 Markdown, RST, LaTeX 등 다양한 형식으로 내보내세요." },
    { icon: FileJson, title: "JSON & YAML", desc: "JSON/YAML 파일을 스키마 검증과 함께 편집하세요. 구조화된 데이터 관리가 쉬워집니다." },
    { icon: Table, title: "표 & 다이어그램", desc: "표, Mermaid 다이어그램, 수식, 각주, 경고 상자 등 풍부한 콘텐츠를 삽입하세요." },
    { icon: BookOpen, title: "템플릿 & 멀티탭", desc: "다양한 문서 템플릿으로 빠르게 시작하고, 여러 문서를 탭으로 동시에 편집하세요." },
    { icon: Printer, title: "PDF & 다형식 내보내기", desc: "작성한 문서를 PDF, Markdown, LaTeX, RST, Typst, AsciiDoc 등으로 내보내세요." },
    { icon: Moon, title: "다크 모드", desc: "눈이 편한 다크 모드를 지원해요. 언제든 테마를 전환할 수 있습니다." },
  ];

  const formats = ["Markdown", "LaTeX", "HTML", "Typst", "RST", "AsciiDoc", "JSON", "YAML", "PDF"];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="flex items-center gap-2.5">
          <img src={docslyLogo} alt="Docsy" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">Docsy</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setIsDark((d) => !d)} className="h-8 w-8 p-0">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button onClick={() => navigate("/editor")} size="sm" className="gap-1.5 rounded-lg">
            에디터 열기 <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.nav>

      {/* Hero */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative flex flex-col items-center justify-center text-center px-6 pt-20 sm:pt-28 pb-8"
      >
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-transparent rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
          className="relative mb-8"
        >
          <img src={docslyLogo} alt="Docsy mascot" className="h-24 w-24 sm:h-32 sm:w-32 drop-shadow-xl" />
          <motion.div
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1.5 shadow-lg"
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl"
        >
          개도 편집하는{" "}
          <span className="relative">
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              개발자 문서
            </span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full origin-left"
            />
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed"
        >
          Markdown, LaTeX 등 개발자 친화적 문서 양식을
          <br className="hidden sm:block" />
          직관적인 WYSIWYG 편집기로 작성하세요.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            onClick={() => navigate("/editor")}
            size="lg"
            className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          >
            지금 시작하기 <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base px-8 py-6 rounded-xl hover:-translate-y-0.5 transition-all"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            기능 살펴보기
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mt-8 flex items-center gap-6 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> 무료 사용</span>
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> 설치 불필요</span>
          <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> 로그인 불필요</span>
        </motion.div>
      </motion.section>

      {/* Editor Preview */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        custom={0}
        className="px-6 sm:px-10 pb-20 pt-4"
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/10 dark:shadow-black/30 bg-card"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">docsy.app/editor</span>
            </div>
            <img
              src={editorPreview}
              alt="Docsy 에디터 미리보기"
              className="w-full"
              loading="lazy"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* Format ribbon */}
      <section className="py-10 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-6">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center text-sm text-muted-foreground mb-6"
          >
            지원하는 포맷
          </motion.p>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {formats.map((f, i) => (
              <motion.span
                key={f}
                variants={fadeUp}
                custom={i}
                className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-foreground shadow-sm"
              >
                {f}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 sm:px-10 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-16"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide uppercase mb-4">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">왜 Docsy인가요?</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              복잡한 문서 작성을 간단하게. 개발자와 비개발자 모두를 위한 편집기.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-border/80 transition-all cursor-default"
              >
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${featureColors[i]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-5 w-5 ${iconColors[i]}`} />
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 sm:px-10 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 rounded-3xl blur-2xl" />
          <div className="relative bg-card border border-border rounded-3xl px-8 sm:px-16 py-16 shadow-sm">
            <motion.img
              src={docslyLogo}
              alt="Docsy"
              className="h-16 w-16 mx-auto mb-6"
              whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
            />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">지금 바로 시작하세요</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              복잡한 문서 양식, Docsy와 함께라면 쉬워집니다.
            </p>
            <Button
              onClick={() => navigate("/editor")}
              size="lg"
              className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            >
              에디터 열기 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src={docslyLogo} alt="Docsy" className="h-5 w-5" />
          <span className="text-sm font-semibold">Docsy</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 Docsy. 누구나 쉽게 쓰는 문서 편집기.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
