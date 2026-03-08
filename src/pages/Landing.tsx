import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Code2, Printer, Moon, Sun, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import docslyLogo from "@/assets/docsly-logo.png";

const Landing = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <img src={docslyLogo} alt="Docsy" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">Docsy</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDark((d) => !d)}
            className="h-8 w-8 p-0"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button onClick={() => navigate("/editor")} size="sm" className="gap-1.5">
            에디터 열기 <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        <div className="relative mb-8">
          <img
            src={docslyLogo}
            alt="Docsy mascot"
            className="h-28 w-28 drop-shadow-lg animate-bounce-slow"
          />
          <div className="absolute -top-2 -right-2 bg-accent rounded-full p-1.5">
            <Sparkles className="h-4 w-4 text-foreground" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl">
          개발자 문서,{" "}
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            누구나 쉽게
          </span>
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
          Markdown, LaTeX 등 개발자 친화적 문서 양식을
          <br className="hidden sm:block" />
          직관적인 WYSIWYG 편집기로 작성하세요.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => navigate("/editor")}
            size="lg"
            className="gap-2 text-base px-7 py-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            지금 시작하기 <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base px-7 py-5 rounded-xl"
            onClick={() =>
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            기능 살펴보기
          </Button>
        </div>
        <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> 무료 사용
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> 설치 불필요
          </span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 bg-secondary/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">왜 Docsy인가요?</h2>
          <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
            복잡한 문서 작성을 간단하게. 개발자와 비개발자 모두를 위한 편집기.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "Markdown WYSIWYG",
                desc: "마크다운 문법을 몰라도 괜찮아요. 보이는 그대로 편집하고, 깔끔한 .md 파일로 저장하세요.",
              },
              {
                icon: Code2,
                title: "LaTeX 편집기",
                desc: "수식이 포함된 학술 문서도 쉽게. 실시간 미리보기와 함께 LaTeX를 편집하세요.",
              },
              {
                icon: Sparkles,
                title: "수식 삽입",
                desc: "에디터 안에서 바로 수학 공식을 삽입하고 렌더링된 결과를 즉시 확인하세요.",
              },
              {
                icon: Printer,
                title: "PDF & 인쇄",
                desc: "작성한 문서를 깔끔한 PDF로 내보내거나 바로 인쇄할 수 있어요.",
              },
              {
                icon: Moon,
                title: "다크 모드",
                desc: "눈이 편한 다크 모드를 지원해요. 언제든 테마를 전환할 수 있습니다.",
              },
              {
                icon: Zap,
                title: "빠르고 가벼운",
                desc: "브라우저에서 바로 실행. 별도 설치 없이 즉시 문서 작성을 시작하세요.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <img src={docslyLogo} alt="Docsy" className="h-16 w-16 mx-auto mb-6" />
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">지금 바로 시작하세요</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          복잡한 문서 양식, Docsy와 함께라면 쉬워집니다.
        </p>
        <Button
          onClick={() => navigate("/editor")}
          size="lg"
          className="gap-2 text-base px-8 py-5 rounded-xl shadow-lg"
        >
          에디터 열기 <ArrowRight className="h-4 w-4" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © 2026 Docsy. 누구나 쉽게 쓰는 문서 편집기.
      </footer>
    </div>
  );
};

export default Landing;
