import type { Locale } from "@/i18n/types";

export interface GuideStep {
  description: string;
  detail: string;
  title: string;
}

export type GuideAudience = "advanced" | "beginner";

export interface GuideWorkflowCard {
  description: string;
  emphasis: string;
  title: string;
}

export interface GuideFeatureCard {
  description: string;
  title: string;
  useWhen: string;
}

export interface GuideSection {
  audience: GuideAudience[];
  bullets: string[];
  id: string;
  steps?: string[];
  summary: string;
  title: string;
}

export interface GuideFaqItem {
  answer: string;
  question: string;
}

export interface GuideVisualTourItem {
  description: string;
  title: string;
  x: number;
  y: number;
}

export interface GuideScenarioItem {
  audience: GuideAudience[];
  caution: string;
  role: string;
  steps: string[];
  summary: string;
  title: string;
}

export interface GuideContent {
  guidePage: {
    faqDescription: string;
    faqItems: GuideFaqItem[];
    faqTitle: string;
    heroDescription: string;
    heroEyebrow: string;
    heroTitle: string;
    recommendedPathDescription: string;
    recommendedPathSteps: string[];
    recommendedPathTitle: string;
    scenarioDescription: string;
    scenarioItems: GuideScenarioItem[];
    scenarioTitle: string;
    sections: GuideSection[];
    visualTourDescription: string;
    visualTourImageAlt: string;
    visualTourItems: GuideVisualTourItem[];
    visualTourTitle: string;
  };
  landing: {
    ctaDescription: string;
    ctaTitle: string;
    featureCards: GuideFeatureCard[];
    featureDescription: string;
    featureEyebrow: string;
    featureTitle: string;
    quickStartDescription: string;
    quickStartEyebrow: string;
    quickStartSteps: GuideStep[];
    quickStartTitle: string;
    workflowCards: GuideWorkflowCard[];
    workflowDescription: string;
    workflowEyebrow: string;
    workflowTitle: string;
  };
}

const koGuideContent: GuideContent = {
  guidePage: {
    faqDescription: "처음 써보는 사용자가 가장 자주 막히는 지점을 기준으로 정리한 질문들입니다.",
    faqItems: [
      {
        answer: "아닙니다. 단일 문서 작업만 한다면 템플릿, 기본 편집, 버전 기록만으로도 충분합니다. Knowledge와 Graph는 문서 관계가 복잡해질 때 여는 것이 더 자연스럽습니다.",
        question: "처음부터 Knowledge나 Graph를 꼭 써야 하나요?",
      },
      {
        answer: "아니요. Docsy의 기본 원칙은 review-first입니다. AI가 만든 결과는 Patch Review에서 confidence와 provenance를 확인한 뒤 수락 또는 거절해야 합니다.",
        question: "AI 제안은 바로 문서에 들어가나요?",
      },
      {
        answer: "모바일에서는 키보드 단축키보다 툴바와 More 메뉴를 중심으로 쓰는 것이 맞습니다. 기본 작업은 툴바에서, 고급 도구는 More와 사이드바 패널에서 찾으면 됩니다.",
        question: "모바일에서는 어떤 방식으로 쓰는 게 가장 좋나요?",
      },
      {
        answer: "보통은 템플릿으로 새 문서를 만들고, 기본 편집과 버전 기록을 먼저 익힌 뒤, 문서가 여러 개로 늘어나면 Knowledge, Graph, Suggestion Queue를 여는 순서가 가장 안전합니다.",
        question: "가장 먼저 익혀야 할 기능 순서는 무엇인가요?",
      },
    ],
    faqTitle: "자주 묻는 질문",
    heroDescription: "Docsy의 핵심 기능을 실제 작업 순서에 맞춰 정리한 사용자 가이드입니다. 문서 생성부터 지식 그래프, 패치 검토, 다문서 유지보수까지 어떤 흐름으로 써야 하는지 설명합니다.",
    heroEyebrow: "사용 가이드",
    heroTitle: "기능 이름이 아니라 작업 흐름으로 Docsy 이해하기",
    recommendedPathDescription: "처음 써보는 사용자라면 아래 순서로 보는 것이 가장 덜 복잡합니다.",
    recommendedPathSteps: [
      "템플릿 또는 빈 문서로 첫 문서를 만든다.",
      "툴바와 기본 편집, 버전 기록부터 익힌다.",
      "AI 제안을 쓸 때는 Patch Review에서 검토한다.",
      "문서가 많아지면 Knowledge, Graph, Suggestion Queue를 연다.",
    ],
    recommendedPathTitle: "처음 쓰는 사용자 추천 경로",
    scenarioDescription: "기능을 개별적으로 외우기보다, 실제 작업 상황을 기준으로 흐름을 보는 편이 더 빠릅니다.",
    scenarioItems: [
      {
        audience: ["beginner"],
        caution: "처음부터 Knowledge나 Graph를 열어 전체 워크스페이스를 분석하려고 하면 오히려 복잡해집니다.",
        role: "단일 문서를 빠르게 써야 하는 사용자",
        steps: [
          "템플릿으로 시작한다.",
          "기본 편집과 버전 기록만 사용해 초안을 정리한다.",
          "최종 검토 후 바로 공유하거나 내보낸다.",
        ],
        summary: "보고서, 회의록, 인수인계 문서처럼 단일 문서를 빠르게 완성해야 할 때 가장 단순한 흐름입니다.",
        title: "빠른 단일 문서 작성",
      },
      {
        audience: ["advanced"],
        caution: "관련 문서가 여러 개일 때는 본문을 직접 다 고치기보다 영향 경로와 패치 검토 흐름을 먼저 확인해야 합니다.",
        role: "연결된 문서를 함께 유지보수하는 사용자",
        steps: [
          "Change Monitoring 또는 Consistency 이슈에서 시작한다.",
          "Graph에서 source-target 관계를 확인한다.",
          "Suggestion Queue와 Patch Review로 타깃 문서를 순서대로 처리한다.",
        ],
        summary: "상위 문서가 바뀌었고 연관 문서가 여러 개 있을 때, 유지보수 오케스트레이션 흐름을 따라가는 방식입니다.",
        title: "연관 문서 동기화 작업",
      },
      {
        audience: ["beginner"],
        caution: "모바일에서는 데스크톱과 같은 밀도의 편집 환경을 기대하기보다, 빠른 확인과 짧은 수정 중심으로 쓰는 것이 좋습니다.",
        role: "이동 중에 확인·수정·공유해야 하는 사용자",
        steps: [
          "사이드바에서 문서를 연다.",
          "툴바와 More로 필요한 수정만 처리한다.",
          "링크 공유나 내보내기로 결과를 전달한다.",
        ],
        summary: "모바일에서 긴 작성보다 짧은 수정과 검토를 해야 할 때 적합한 흐름입니다.",
        title: "모바일 빠른 수정과 공유",
      },
    ],
    scenarioTitle: "실제 사용 시나리오",
    visualTourDescription: "아래 화면 기준으로 주요 작업 위치를 먼저 익히면, 문서 작성과 검토 흐름을 훨씬 빠르게 따라갈 수 있습니다.",
    visualTourImageAlt: "Docsy 에디터 화면 안내",
    visualTourItems: [
      {
        description: "왼쪽 레일에서 문서를 열고 바꾸고, 새 문서를 만드는 출발점입니다. 모바일에서는 파일 탐색기 제목을 눌러 사이드바를 닫을 수도 있습니다.",
        title: "파일 탐색기",
        x: 2,
        y: 42,
      },
      {
        description: "현재 문서 이름, 확장자, 그리고 Markdown/LaTeX/HTML 같은 편집 모드를 확인하고 전환하는 영역입니다.",
        title: "문서 정보와 모드 전환",
        x: 34,
        y: 3.5,
      },
      {
        description: "제목, 리스트, 정렬, More 도구까지 빠르게 접근하는 기본 편집 축입니다.",
        title: "에디터 툴바",
        x: 42,
        y: 8.5,
      },
      {
        description: "공유, 패치 검토, AI 기능처럼 결과물을 정리하거나 제안을 열어 보는 진입점입니다.",
        title: "상단 액션",
        x: 88,
        y: 3.5,
      },
      {
        description: "문서를 직접 작성하는 주 작업 영역입니다. 리치 텍스트와 source가 함께 맞물리는 중심입니다.",
        title: "문서 편집 영역",
        x: 44,
        y: 22,
      },
    ],
    visualTourTitle: "화면으로 먼저 이해하는 Docsy",
    sections: [
      {
        audience: ["beginner"],
        bullets: [
          "Docsy는 로컬 우선 문서 편집과 검토 중심 AI 제안을 함께 다루는 편집기입니다.",
          "단일 문서 작성부터 연관 문서 점검, 패치 검토, 공유/내보내기까지 한 흐름으로 이어집니다.",
          "처음에는 템플릿과 기본 편집만 써도 되고, 문서 수가 늘면 Knowledge와 Graph를 여는 방식이 좋습니다.",
        ],
        id: "getting-started",
        steps: [
          "새 문서를 만들거나 기존 문서를 불러옵니다.",
          "문서 형식에 따라 리치 텍스트 또는 구조 편집 모드를 선택합니다.",
          "필요할 때만 사이드바의 Knowledge, History, Patch Review 같은 고급 기능으로 확장합니다.",
        ],
        summary: "처음부터 모든 기능을 다 쓸 필요는 없습니다. Docsy는 문서 작업이 커질수록 고급 기능을 단계적으로 열어 쓰는 구조가 더 잘 맞습니다.",
        title: "시작하기",
      },
      {
        audience: ["beginner"],
        bullets: [
          "템플릿은 빈 문서보다 훨씬 빠르게 출발점을 만들어 줍니다.",
          "Markdown, LaTeX, HTML은 리치 텍스트 편집 흐름을 지원합니다.",
          "JSON, YAML은 구조 편집 흐름으로 별도 관리됩니다.",
        ],
        id: "first-document",
        steps: [
          "사이드바 또는 랜딩에서 에디터로 들어갑니다.",
          "빈 문서를 만들거나 템플릿을 고릅니다.",
          "문서 형식과 목적에 맞게 제목과 기본 섹션부터 정리합니다.",
        ],
        summary: "처음 문서는 템플릿으로 시작하는 것이 가장 빠릅니다. 목적과 형식만 먼저 정하고 나중에 세부 구조를 다듬는 방식이 안전합니다.",
        title: "첫 문서 만들기",
      },
      {
        audience: ["beginner"],
        bullets: [
          "리치 텍스트 편집기에서는 WYSIWYG와 source가 실시간으로 동기화됩니다.",
          "툴바는 자주 쓰는 서식과 블록 작업을 빠르게 처리하기 위한 도구입니다.",
          "문서 도구와 고급 블록은 필요한 순간에만 열어도 됩니다.",
        ],
        id: "basic-editing",
        steps: [
          "기본 서식과 제목, 리스트, 인용으로 문서 구조를 먼저 잡습니다.",
          "필요하면 문서 도구와 고급 블록을 열어 표, 각주, 캡션 등을 추가합니다.",
          "구조 편집 모드에서는 source 자체를 중심으로 수정합니다.",
        ],
        summary: "기본 편집 흐름은 단순해야 합니다. 자주 쓰는 서식은 툴바에서, 복잡한 요소는 확장 도구에서 처리하는 방식으로 나눠 쓰는 것이 좋습니다.",
        title: "기본 편집",
      },
      {
        audience: ["beginner"],
        bullets: [
          "데스크톱에서는 편집과 서식 작업을 단축키로 훨씬 빠르게 처리할 수 있습니다.",
          "리치 텍스트 편집기에서만 동작하는 단축키가 있으므로 구조 편집기와 구분해서 봐야 합니다.",
          "모바일에서는 같은 작업을 툴바와 더 보기 메뉴에서 대신 수행합니다.",
        ],
        id: "keyboard-shortcuts",
        steps: [
          "상단의 키보드 단축키 모달을 열어 현재 플랫폼 기준 키 조합을 확인합니다.",
          "자주 쓰는 실행 취소, 서식, 제목, 정렬 단축키부터 익힙니다.",
          "모바일에서는 동일한 작업을 툴바와 More 메뉴에서 찾습니다.",
        ],
        summary: "단축키는 편집 속도를 크게 높여 주지만, 모든 모드에서 똑같이 동작하지는 않습니다. 리치 텍스트 기준으로 이해하는 것이 중요합니다.",
        title: "키보드 단축키",
      },
      {
        audience: ["beginner"],
        bullets: [
          "자동 저장은 최근 편집 상태를 계속 남깁니다.",
          "Version History에서는 특정 시점의 스냅샷을 다시 열고 복원할 수 있습니다.",
          "패치 적용이나 내보내기 이후 상태를 비교할 때 특히 유용합니다.",
        ],
        id: "versioning-and-recovery",
        steps: [
          "사이드바의 기록 탭에서 최근 스냅샷 목록을 확인합니다.",
          "필요한 스냅샷을 미리보기로 열어 차이를 확인합니다.",
          "원하는 시점으로 복원한 뒤 다시 편집을 이어갑니다.",
        ],
        summary: "버전 기록은 실수 복구뿐 아니라, AI 패치 적용 전후를 비교하는 용도로도 중요합니다.",
        title: "버전 관리와 복구",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Knowledge는 열린 문서들을 기반으로 로컬 인덱스를 만들고, 연관 문서와 이슈를 찾아줍니다.",
          "Graph는 문서, 섹션, 이미지 관계를 한 번에 살펴볼 수 있는 작업 화면입니다.",
          "문서가 많아질수록 직접 탐색보다 이슈나 영향 경로를 따라 진입하는 방식이 효율적입니다.",
        ],
        id: "knowledge-and-graph",
        steps: [
          "사이드바의 Knowledge에서 연관 문서, 영향도, 상태 이슈를 먼저 확인합니다.",
          "문맥이 복잡하면 Graph로 이동해 source-target 체인을 따라갑니다.",
          "그래프에서 관련 문서를 열거나, 필요한 경우 제안 흐름으로 넘어갑니다.",
        ],
        summary: "Knowledge와 Graph는 문서가 여러 개일 때 진가가 나옵니다. 단순 검색이 아니라, 왜 이 문서가 영향을 받는지 추적하는 도구로 보면 됩니다.",
        title: "Knowledge와 Graph",
      },
      {
        audience: ["beginner", "advanced"],
        bullets: [
          "AI가 만든 변경안은 바로 문서에 들어가지 않고 Patch Review로 먼저 들어옵니다.",
          "패치 수, 신뢰도, 출처 커버리지, source attribution을 검토할 수 있습니다.",
          "출처 누락 패치는 따로 확인하고 더 보수적으로 판단하는 것이 좋습니다.",
        ],
        id: "patch-review",
        steps: [
          "비교, 업데이트 제안, 그래프 기반 suggest patch 결과를 Patch Review에서 엽니다.",
          "원문과 제안 내용을 비교하고, confidence와 provenance를 확인합니다.",
          "수락/거절 후 적용이 맞는지 판단하고 최종 반영합니다.",
        ],
        summary: "Patch Review는 안전장치입니다. Docsy의 AI 유지보수 흐름은 항상 검토 단계를 먼저 거치도록 설계되어 있습니다.",
        title: "패치 검토",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Suggestion Queue는 여러 문서에 대한 업데이트 요청을 한 줄씩 관리하는 작업 큐입니다.",
          "Change Monitoring, Consistency, Impact 분석 결과가 큐에 쌓일 수 있습니다.",
          "각 항목은 재시도, 그래프 재진입, 검토 다시 열기 같은 후속 작업을 지원합니다.",
        ],
        id: "multi-document-maintenance",
        steps: [
          "상위 문서 변경이나 일관성 이슈를 기준으로 업데이트 제안을 큐에 넣습니다.",
          "준비된 항목부터 패치 검토를 열어 순서대로 처리합니다.",
          "실패 항목은 재시도하고, 필요한 경우 그래프 문맥으로 돌아가 원인을 다시 확인합니다.",
        ],
        summary: "문서가 많아질수록 한 번에 고치려 하지 말고 큐로 분리해 처리하는 것이 안정적입니다.",
        title: "다문서 유지보수",
      },
      {
        audience: ["beginner"],
        bullets: [
          "문서 공유는 링크와 QR로 빠르게 시작할 수 있습니다.",
          "내보내기는 Markdown, LaTeX, HTML, JSON, YAML, PDF 등 목적에 맞는 형식으로 나눠집니다.",
          "공유와 내보내기 전에는 포맷 점검과 패치 검토 상태를 같이 확인하는 편이 안전합니다.",
        ],
        id: "share-and-export",
        steps: [
          "문서를 공유할지, 파일로 내보낼지 먼저 결정합니다.",
          "공유라면 share link/QR을 사용하고, 결과물이 필요하면 내보내기를 선택합니다.",
          "복잡한 문서는 최종 공유 전에 포맷 점검과 버전 기록을 한 번 더 확인합니다.",
        ],
        summary: "공유와 내보내기는 마지막 단계입니다. 검토가 끝난 문서인지 먼저 확인하는 습관이 중요합니다.",
        title: "공유와 내보내기",
      },
      {
        audience: ["beginner"],
        bullets: [
          "모바일에서는 사이드바와 툴바가 데스크톱보다 더 압축된 방식으로 동작합니다.",
          "고급 도구는 More나 Drawer 안으로 들어가므로, 화면이 단순해 보여도 기능이 빠진 것은 아닙니다.",
          "긴 버튼은 줄바꿈되거나 세로로 쌓일 수 있으므로, 잘림보다 접근 가능성을 우선합니다.",
        ],
        id: "mobile-usage",
        steps: [
          "모바일에서는 파일 탐색기 제목을 눌러 사이드바를 닫을 수 있습니다.",
          "툴바 기본 액션은 가로 스크롤하고, 추가 도구는 More에서 엽니다.",
          "키보드 단축키 대신 툴바, More, 사이드바 패널을 중심으로 작업합니다.",
        ],
        summary: "모바일은 모든 기능을 같은 방식으로 보여주지 않습니다. 대신 자주 쓰는 기능을 우선 노출하고, 나머지는 접어서 유지합니다.",
        title: "모바일 사용 팁",
      },
    ],
  },
  landing: {
    ctaDescription: "기능 이름만 나열한 소개가 아니라, 실제로 어떤 순서로 쓰면 되는지 바로 볼 수 있습니다.",
    ctaTitle: "설명서가 필요한 기능은 랜딩에서 바로 연결하세요",
    featureCards: [
      {
        description: "새 문서를 빠르게 시작하고 기본 구조를 만들 때 가장 먼저 쓰는 기능입니다.",
        title: "Templates",
        useWhen: "반복되는 문서 형식이 있거나, 빈 문서에서 시작하기 싫을 때",
      },
      {
        description: "실수 복구와 변경 전후 비교를 위해 최근 스냅샷을 다시 여는 기능입니다.",
        title: "Version History",
        useWhen: "패치 적용 전후를 비교하거나 이전 상태로 돌아가야 할 때",
      },
      {
        description: "연관 문서, 영향도, 상태 이슈를 먼저 훑어보는 기본 진입점입니다.",
        title: "Knowledge",
        useWhen: "문서가 여러 개이고 어떤 문서가 서로 연결되는지 파악해야 할 때",
      },
      {
        description: "source-target 관계와 영향 경로를 시각적으로 추적하는 작업 화면입니다.",
        title: "Graph",
        useWhen: "영향 경로나 일관성 드리프트를 더 입체적으로 추적해야 할 때",
      },
      {
        description: "AI 변경안을 승인하기 전에 confidence와 provenance를 검토하는 안전 장치입니다.",
        title: "Patch Review",
        useWhen: "비교, 업데이트 제안, 그래프 기반 패치를 실제 문서에 반영하기 전에",
      },
      {
        description: "여러 문서에 대한 후속 업데이트를 순차적으로 처리하는 작업 큐입니다.",
        title: "Suggestion Queue",
        useWhen: "한 문서 변경이 여러 타깃 문서에 영향을 줄 때",
      },
    ],
    featureDescription: "모든 기능을 한 번에 쓸 필요는 없습니다. 상황별로 어떤 기능을 꺼내 쓰면 되는지 먼저 이해하는 것이 중요합니다.",
    featureEyebrow: "상황별 기능 안내",
    featureTitle: "이럴 때 이 기능을 쓰세요",
    quickStartDescription: "처음에는 세 단계만 이해하면 충분합니다. 문서를 만들고, 검토 가능한 수정 흐름을 익히고, 마지막에 공유하거나 내보내면 됩니다.",
    quickStartEyebrow: "빠른 시작",
    quickStartSteps: [
      {
        description: "빈 문서나 템플릿으로 시작하고, 목적에 맞는 형식을 먼저 고릅니다.",
        detail: "반복 작업이 많다면 템플릿부터 쓰는 것이 가장 빠릅니다.",
        title: "문서 만들기",
      },
      {
        description: "리치 텍스트 편집기와 툴바로 작성하고, AI 제안은 패치 검토에서 확인합니다.",
        detail: "바로 반영하지 않고 검토 흐름을 거치는 것이 기본입니다.",
        title: "작성과 검토",
      },
      {
        description: "문서가 늘어나면 Knowledge, Graph, Suggestion Queue로 영향을 추적합니다.",
        detail: "최종 결과는 공유 링크나 내보내기로 전달하면 됩니다.",
        title: "연결 문서 관리와 전달",
      },
    ],
    quickStartTitle: "처음 쓸 때는 세 단계만 이해하세요",
    workflowCards: [
      {
        description: "템플릿과 기본 편집으로 문서를 빠르게 열고 초안을 만드는 흐름",
        emphasis: "초안 작성 시작점",
        title: "문서 작성 시작",
      },
      {
        description: "비교, 업데이트 제안, AI 결과를 패치 검토로 안전하게 넘기는 흐름",
        emphasis: "검토 우선",
        title: "변경안 검토",
      },
      {
        description: "Knowledge와 Graph로 연관 문서와 영향 범위를 추적하는 흐름",
        emphasis: "관계 파악",
        title: "문서 관계 추적",
      },
      {
        description: "Suggestion Queue로 여러 문서의 후속 업데이트를 순차 처리하는 흐름",
        emphasis: "다문서 정리",
        title: "유지보수 오케스트레이션",
      },
    ],
    workflowDescription: "Docsy는 편집기이지만, 문서가 많아질수록 검토와 추적 도구의 비중이 커집니다. 아래 흐름으로 이해하면 기능이 훨씬 단순해집니다.",
    workflowEyebrow: "핵심 워크플로",
    workflowTitle: "문서 작업을 이렇게 나눠서 보세요",
  },
};

const enGuideContent: GuideContent = {
  guidePage: {
    faqDescription: "These are the questions most likely to block first-time users before the product model becomes familiar.",
    faqItems: [
      {
        answer: "No. If you are working on a single document, templates, editing, and version history are enough. Knowledge and Graph become more useful when related-document complexity increases.",
        question: "Do I need Knowledge or Graph immediately?",
      },
      {
        answer: "No. Docsy is designed around review-first mutation. AI output should be inspected in Patch Review before any change is applied to a document.",
        question: "Do AI suggestions apply directly to the document?",
      },
      {
        answer: "On mobile, the best path is toolbar first, More second, sidebar panels when needed. Mobile is meant to preserve access, not to mirror the desktop layout one-to-one.",
        question: "What is the best way to use Docsy on mobile?",
      },
      {
        answer: "The safest order is templates first, then basic editing and version history, then Patch Review, and only after that the workspace-level tools like Knowledge, Graph, and Suggestion Queue.",
        question: "What should I learn first?",
      },
    ],
    faqTitle: "Frequently asked questions",
    heroDescription: "This guide explains Docsy in task order. It covers document creation, editing, versioning, knowledge panels, patch review, and multi-document maintenance in the order users actually encounter them.",
    heroEyebrow: "User guide",
    heroTitle: "Learn Docsy as a workflow, not as a feature list",
    recommendedPathDescription: "If this is your first time using Docsy, this is the least overwhelming path through the product.",
    recommendedPathSteps: [
      "Create the first document from a template or blank file.",
      "Learn toolbar editing and version history first.",
      "Use Patch Review whenever AI suggestions appear.",
      "Open Knowledge, Graph, and Suggestion Queue only when the workspace grows.",
    ],
    recommendedPathTitle: "Recommended path for first-time users",
    scenarioDescription: "Most users understand Docsy faster through realistic scenarios than through a flat feature list.",
    scenarioItems: [
      {
        audience: ["beginner"],
        caution: "Do not open every advanced surface first. For a single document, that only increases complexity.",
        role: "Someone who needs to finish one document quickly",
        steps: [
          "Start from a template.",
          "Use basic editing and version history only.",
          "Review the final state and share or export.",
        ],
        summary: "This is the simplest path for reports, notes, handovers, and other one-document outputs.",
        title: "Fast single-document writing",
      },
      {
        audience: ["advanced"],
        caution: "When many related documents exist, avoid editing them inline one by one without checking impact and review state first.",
        role: "Someone maintaining related documents after an upstream change",
        steps: [
          "Start from Change Monitoring or a consistency issue.",
          "Use Graph to confirm the source-target path.",
          "Process affected targets through Suggestion Queue and Patch Review.",
        ],
        summary: "This is the right path when one source document drives maintenance work across several targets.",
        title: "Related-document sync workflow",
      },
      {
        audience: ["beginner"],
        caution: "On mobile, optimize for short edits and review rather than trying to reproduce the desktop workflow exactly.",
        role: "Someone checking, correcting, and sharing on the go",
        steps: [
          "Open the target document from the sidebar.",
          "Use the toolbar and More for small edits.",
          "Share or export once the change is confirmed.",
        ],
        summary: "This is the most realistic mobile workflow for quick validation and delivery.",
        title: "Mobile quick edit and share",
      },
    ],
    scenarioTitle: "Real usage scenarios",
    visualTourDescription: "Learn the main interaction zones first. Once users know where creation, editing, review, and workspace inspection live, the rest of the product becomes much easier to navigate.",
    visualTourImageAlt: "Annotated Docsy editor preview",
    visualTourItems: [
      {
        description: "This left rail is the entry point for opening, switching, and creating documents. On mobile, the file explorer title also closes the sidebar.",
        title: "File explorer",
        x: 2,
        y: 42,
      },
      {
        description: "This area shows the current document name, extension, and the active editing mode such as Markdown, LaTeX, or HTML.",
        title: "Document info and mode switch",
        x: 34,
        y: 3.5,
      },
      {
        description: "The main editing shortcut bar for structure, formatting, and quick insert actions.",
        title: "Editor toolbar",
        x: 42,
        y: 8.5,
      },
      {
        description: "The header actions for sharing, patch review, AI tools, and export-oriented workflows.",
        title: "Header actions",
        x: 88,
        y: 3.5,
      },
      {
        description: "The primary writing surface where rich-text editing and source-aware behavior meet.",
        title: "Document canvas",
        x: 44,
        y: 22,
      },
    ],
    visualTourTitle: "Understand Docsy through the screen first",
    sections: [
      {
        audience: ["beginner"],
        bullets: [
          "Docsy combines local-first document editing with review-first AI maintenance.",
          "It supports both single-document writing and multi-document inspection flows.",
          "You do not need every feature on day one; advanced surfaces matter more as the workspace grows.",
        ],
        id: "getting-started",
        steps: [
          "Create or open a document.",
          "Choose the editing mode that fits the document type.",
          "Open Knowledge, Graph, and Patch Review only when the document network becomes more complex.",
        ],
        summary: "Docsy works best when you start with the simplest path and expand into graph, diagnostics, and review flows only when the document set becomes harder to manage manually.",
        title: "Getting started",
      },
      {
        audience: ["beginner"],
        bullets: [
          "Templates are the fastest way to start structured writing.",
          "Markdown, LaTeX, and HTML use rich-text editing flows.",
          "JSON and YAML follow structured editing flows instead.",
        ],
        id: "first-document",
        steps: [
          "Open the editor from landing.",
          "Start from a blank file or a template.",
          "Name the document and establish the first sections before refining details.",
        ],
        summary: "For most users, the safest start is template-first. Decide the document purpose and format first, then refine structure after the skeleton exists.",
        title: "Create your first document",
      },
      {
        audience: ["beginner"],
        bullets: [
          "Rich-text editors keep source and WYSIWYG in sync.",
          "The toolbar is for frequent structure and formatting operations.",
          "Document tools and advanced blocks can stay hidden until they are needed.",
        ],
        id: "basic-editing",
        steps: [
          "Start with headings, lists, and block structure.",
          "Use document tools for richer elements like tables, captions, and footnotes.",
          "Use structured editors directly when working in JSON or YAML.",
        ],
        summary: "The editing model stays simpler if basic formatting and advanced insert tools are treated as separate layers.",
        title: "Basic editing",
      },
      {
        audience: ["beginner"],
        bullets: [
          "Desktop users can move much faster with shortcuts.",
          "Shortcut behavior mostly applies to rich-text editors, not every mode.",
          "On mobile, the toolbar and More drawer replace shortcut-heavy flows.",
        ],
        id: "keyboard-shortcuts",
        steps: [
          "Open the keyboard shortcut modal and confirm the platform modifier key.",
          "Learn the common undo, formatting, heading, and alignment shortcuts first.",
          "Use toolbar and More on mobile instead of relying on keyboard behavior.",
        ],
        summary: "Shortcuts are a productivity tool, but they make sense only when users know which editor modes they apply to.",
        title: "Keyboard shortcuts",
      },
      {
        audience: ["beginner"],
        bullets: [
          "Autosave keeps recent state without manual effort.",
          "Version History lets you inspect snapshots and restore older states.",
          "This is especially useful before and after patch application.",
        ],
        id: "versioning-and-recovery",
        steps: [
          "Open the History tab in the sidebar.",
          "Inspect recent snapshots and preview the state you need.",
          "Restore the target state and continue editing from there.",
        ],
        summary: "Version history is both a recovery tool and a review tool when changes are applied through patch-based flows.",
        title: "Versioning and recovery",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Knowledge creates a local index over opened documents and derives related-document signals.",
          "Graph helps inspect source-target relationships and issue chains visually.",
          "As the workspace grows, issue-driven graph entry is more efficient than broad manual browsing.",
        ],
        id: "knowledge-and-graph",
        steps: [
          "Use Knowledge to inspect impact, health, consistency, and change monitoring first.",
          "Open Graph when the relationship path is unclear.",
          "Move from Graph into source documents or suggestion flows as needed.",
        ],
        summary: "Knowledge and Graph are not just search tools. They are inspection surfaces for understanding why documents affect each other.",
        title: "Knowledge and graph",
      },
      {
        audience: ["beginner", "advanced"],
        bullets: [
          "AI changes do not apply directly to documents.",
          "Patch Review exposes patch count, confidence, provenance, and source attribution.",
          "Patches with provenance gaps should be treated more conservatively.",
        ],
        id: "patch-review",
        steps: [
          "Open Patch Review from comparison, update suggestions, or graph-driven actions.",
          "Inspect original vs suggested changes and review metadata.",
          "Accept or reject deliberately before any document mutation happens.",
        ],
        summary: "Patch Review is the safety boundary in Docsy. It keeps review explicit and prevents AI changes from bypassing human inspection.",
        title: "Patch Review",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Suggestion Queue tracks follow-up work across multiple documents.",
          "Queue items may come from change monitoring, impact analysis, or consistency drift.",
          "Each item supports retry, graph re-entry, and review reopen actions.",
        ],
        id: "multi-document-maintenance",
        steps: [
          "Queue impacted document pairs from diagnostics.",
          "Work through ready items one by one in Patch Review.",
          "Retry failures and reopen graph context when a suggestion needs more investigation.",
        ],
        summary: "As soon as one source affects many targets, queue-based review is safer than trying to fix everything inline.",
        title: "Multi-document maintenance",
      },
      {
        audience: ["beginner"],
        bullets: [
          "Share links and QR are for quick distribution.",
          "Exports are for durable outputs in the target format.",
          "Before sharing or exporting, it is safer to check format and patch-review state.",
        ],
        id: "share-and-export",
        steps: [
          "Decide whether the document should be shared live or exported as a file.",
          "Use share link / QR for lightweight access.",
          "Use export when the output format itself matters.",
        ],
        summary: "Sharing and export are the last step. The more complex the document is, the more valuable it is to confirm review state before delivery.",
        title: "Share and export",
      },
      {
        audience: ["beginner"],
        bullets: [
          "Mobile compresses navigation and editing surfaces more aggressively than desktop.",
          "Advanced tools move into More or drawer-style surfaces.",
          "The design prioritizes accessibility of actions over preserving a desktop-like layout.",
        ],
        id: "mobile-usage",
        steps: [
          "Use the file explorer title to close the mobile sidebar.",
          "Scroll the toolbar for core actions and use More for extended tools.",
          "Treat toolbar, More, and sidebar panels as the mobile replacement for keyboard-heavy workflows.",
        ],
        summary: "Mobile keeps the same product model, but exposes it through compressed navigation and deferred tools rather than a dense desktop toolbar.",
        title: "Mobile usage tips",
      },
    ],
  },
  landing: {
    ctaDescription: "Instead of learning Docsy as a long feature list, open the guide and follow the product in workflow order.",
    ctaTitle: "Need a real usage guide instead of feature marketing?",
    featureCards: [
      {
        description: "The fastest way to start a document with a useful structure already in place.",
        title: "Templates",
        useWhen: "You are starting repeatable reports, runbooks, handovers, or specs.",
      },
      {
        description: "A recovery and comparison tool built around recent local snapshots.",
        title: "Version History",
        useWhen: "You need to undo a bad change or compare before-and-after states.",
      },
      {
        description: "The first workspace-level inspection surface for related docs and health issues.",
        title: "Knowledge",
        useWhen: "You need to understand which documents are connected before making changes.",
      },
      {
        description: "A visual route for tracing source-target context and affected paths.",
        title: "Graph",
        useWhen: "You need to inspect why a consistency or impact issue exists.",
      },
      {
        description: "The review boundary for AI-generated document changes.",
        title: "Patch Review",
        useWhen: "You want to inspect confidence and provenance before applying changes.",
      },
      {
        description: "The queue surface for processing follow-up work across multiple documents.",
        title: "Suggestion Queue",
        useWhen: "One source document produces work for several related targets.",
      },
    ],
    featureDescription: "Not every feature should be used all the time. The important part is knowing which tool matches which stage of the workflow.",
    featureEyebrow: "Use the right tool",
    featureTitle: "When should you use each feature?",
    quickStartDescription: "Most first sessions only need three ideas: create the document, review changes safely, and deliver the result.",
    quickStartEyebrow: "Quick start",
    quickStartSteps: [
      {
        description: "Start from a blank file or a template and choose the right document mode first.",
        detail: "Templates are the fastest entry when you already know the document type.",
        title: "Create the document",
      },
      {
        description: "Write in the editor and inspect AI changes through Patch Review instead of applying them blindly.",
        detail: "Docsy is designed around review-first mutation.",
        title: "Edit and review",
      },
      {
        description: "As the workspace grows, use Knowledge, Graph, and Queue to manage related documents before sharing or exporting.",
        detail: "This is where Docsy becomes more than a single-file editor.",
        title: "Track related work and deliver",
      },
    ],
    quickStartTitle: "You only need three ideas to get started",
    workflowCards: [
      {
        description: "Start a document quickly with templates and rich-text editing.",
        emphasis: "First draft",
        title: "Create and write",
      },
      {
        description: "Move AI-generated changes into explicit patch inspection before applying anything.",
        emphasis: "Review-first",
        title: "Review changes safely",
      },
      {
        description: "Trace related documents and issue chains through Knowledge and Graph.",
        emphasis: "Relationship tracing",
        title: "Understand document impact",
      },
      {
        description: "Work through multiple impacted targets in queue order instead of fixing everything inline.",
        emphasis: "Queue orchestration",
        title: "Maintain multiple docs",
      },
    ],
    workflowDescription: "Docsy starts as an editor, but it becomes most valuable when review, traceability, and multi-document maintenance are part of the workflow.",
    workflowEyebrow: "Core workflows",
    workflowTitle: "Think in workflows, not in isolated features",
  },
};

export const getGuideContent = (locale: Locale): GuideContent =>
  locale === "ko" ? koGuideContent : enGuideContent;
