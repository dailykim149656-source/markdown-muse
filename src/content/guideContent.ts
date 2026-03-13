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
      {
        answer: "It means the document synced successfully, but Google Docs could not preserve some structures perfectly. Check the warning badge, review the Patch Review warning summary, and compare the remote document before treating the sync as lossless.",
        question: "What does Synced with warnings mean?",
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
      "Use Google Workspace connect/import and Patch Review warning state only when documents are shared beyond the local editor.",
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
        audience: ["advanced"],
        bullets: [
          "Google Workspace lets the editor import real Google Docs into the local review flow.",
          "Rescan and refresh make remote changes visible before sync and patch application.",
          "Conflict and warning state are part of the product model, not edge cases hidden behind logs.",
        ],
        id: "google-workspace-sync",
        steps: [
          "Connect Google Workspace and import the target Google Doc.",
          "Use rescan when the upstream Google Doc may have changed remotely.",
          "Refresh stale imports and treat conflict or warning badges as part of the review workflow.",
        ],
        summary: "Google Workspace integration matters when the source of truth lives outside the local editor. Docsy is designed to bring remote change visibility and sync safety into the same workflow as review and maintenance.",
        title: "Google Workspace and sync state",
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
        audience: ["advanced"],
        bullets: [
          "Patch Review, Suggestion Queue, and sharing/export should be read together before handoff.",
          "Google Workspace warnings and conflicts should be resolved before treating the current workspace as deliverable.",
          "As work scales, use focused graph and queue review to close the actual backlog before sharing results.",
        ],
        id: "operations-and-release",
        steps: [
          "Finish queued reviews and resolve sync warnings or conflicts.",
          "Confirm the target docs are updated or intentionally deferred.",
          "Share or export only after the review state is understood.",
        ],
        summary: "Handoff quality is still visible in the product, but it now comes from existing review, queue, sync, and export surfaces rather than a dedicated release gate panel.",
        title: "Handoff and delivery readiness",
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
        description: "The first workspace-level inspection surface for related docs, health, consistency, and change signals.",
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
      {
        description: "A live import and sync layer for Google Docs with rescan, refresh, conflict handling, and warning state.",
        title: "Google Workspace",
        useWhen: "The document source of truth lives in Google Docs or is shared outside the local editor.",
      },
      {
        description: "The final delivery surface for share links, QR, print, and file export after review.",
        title: "Share and export",
        useWhen: "Reviewed changes are ready to be handed off or distributed.",
      },
    ],
    featureDescription: "The important question is not which feature exists. It is which product surface matches the current stage of the maintenance workflow.",
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
      {
        description: "Import Google Docs, rescan remote changes, refresh stale copies, and resolve sync conflicts before applying reviewed patches.",
        emphasis: "Shared source of truth",
        title: "Sync with Google Workspace",
      },
      {
        description: "Clear queue and review backlog, check Google Workspace warnings, then share or export the result.",
        emphasis: "Handoff readiness",
        title: "Prepare handoff",
      },
    ],
    workflowDescription: "Docsy starts as an editor, but its real value appears when review, traceability, workspace sync, and safe handoff become part of the workflow.",
    workflowEyebrow: "Core workflows",
    workflowTitle: "Think in workflows, not in isolated features",
  },
};

const koGuideContentNormalized: GuideContent = {
  guidePage: {
    faqDescription: "처음 사용하는 사용자와 운영자가 실제로 자주 막히는 질문을 현재 구현 상태 기준으로 정리했습니다.",
    faqItems: [
      {
        answer: "아니요. 단일 문서만 다룬다면 템플릿, 기본 편집, 버전 기록만으로도 충분합니다. Knowledge와 Graph는 관련 문서가 늘어나고 변경 영향이 생길 때 더 중요해집니다.",
        question: "Knowledge나 Graph를 처음부터 꼭 써야 하나요?",
      },
      {
        answer: "아니요. Docsy는 review-first가 기본입니다. AI가 만든 결과는 Patch Review에서 confidence와 provenance를 확인한 뒤 수락 또는 거절해야 합니다.",
        question: "AI 제안이 문서에 바로 적용되나요?",
      },
      {
        answer: "모바일에서는 toolbar 먼저, More 두 번째, sidebar panel은 필요할 때 여는 방식이 가장 좋습니다. 데스크톱과 같은 밀도의 레이아웃을 그대로 따라가기보다 핵심 접근성을 유지하는 데 초점이 있습니다.",
        question: "모바일에서는 어떻게 쓰는 것이 가장 좋나요?",
      },
      {
        answer: "가장 안전한 순서는 템플릿과 기본 편집, 버전 기록을 먼저 익힌 뒤 Patch Review를 이해하고, 그 다음에 Knowledge, Graph, Suggestion Queue 같은 workspace 단위 기능으로 확장하는 것입니다.",
        question: "무엇부터 익히는 것이 좋나요?",
      },
      {
        answer: "`Synced with warnings`는 동기화는 성공했지만 Google Docs가 일부 구조를 완전히 보존하지 못했음을 뜻합니다. badge, Patch Review warning summary, 실제 Google Doc 결과를 함께 확인해야 합니다.",
        question: "`Synced with warnings`는 무슨 뜻인가요?",
      },
    ],
    faqTitle: "자주 묻는 질문",
    heroDescription: "이 가이드는 Docsy를 기능 목록이 아니라 실제 작업 순서로 설명합니다. 문서 생성, 편집, 버전 복구, 그래프 추적, Patch Review, Google Workspace sync, 전달 준비까지 사용자가 실제로 만나는 흐름으로 정리했습니다.",
    heroEyebrow: "사용 가이드",
    heroTitle: "기능 이름이 아니라 작업 흐름으로 Docsy 이해하기",
    recommendedPathDescription: "처음 사용할 때 가장 덜 복잡한 순서입니다.",
    recommendedPathSteps: [
      "빈 문서나 템플릿으로 첫 문서를 만든다.",
      "toolbar 편집과 version history를 먼저 익힌다.",
      "AI 제안이 생기면 Patch Review에서 검토한다.",
      "문서가 연결되기 시작하면 Knowledge, Graph, Suggestion Queue를 연다.",
      "Google Docs와 공유되는 문서라면 마지막에 Google Workspace import/sync와 Patch Review warning 상태를 함께 확인한다.",
    ],
    recommendedPathTitle: "처음 사용자에게 추천하는 경로",
    scenarioDescription: "기능 설명보다 실제 상황을 기준으로 보면 Docsy를 훨씬 빨리 이해할 수 있습니다.",
    scenarioItems: [
      {
        audience: ["beginner"],
        caution: "단일 문서 작업에서 모든 고급 surface를 동시에 열면 오히려 복잡해집니다.",
        role: "하나의 문서를 빠르게 끝내야 하는 사용자",
        steps: [
          "템플릿이나 빈 문서로 시작합니다.",
          "기본 편집과 version history까지만 사용합니다.",
          "최종 상태를 확인한 뒤 share 또는 export로 전달합니다.",
        ],
        summary: "보고서, 회의록, 인수인계 문서처럼 한 문서 중심 작업에 가장 적합한 흐름입니다.",
        title: "빠른 단일 문서 작성",
      },
      {
        audience: ["advanced"],
        caution: "관련 문서가 여러 개라면 본문을 하나씩 직접 수정하기보다 impact, graph, queue 상태를 먼저 보는 편이 안전합니다.",
        role: "상위 문서 변경 후 관련 문서를 함께 유지보수하는 사용자",
        steps: [
          "Change Monitoring이나 Consistency 이슈에서 시작합니다.",
          "Graph로 source-target 경로를 확인합니다.",
          "Suggestion Queue와 Patch Review로 타깃 문서를 순서대로 처리합니다.",
        ],
        summary: "하나의 source 문서가 여러 downstream 문서에 영향을 줄 때 가장 적합한 흐름입니다.",
        title: "관련 문서 동기화 워크플로우",
      },
      {
        audience: ["beginner"],
        caution: "모바일에서는 데스크톱을 그대로 따라 하기보다 짧은 수정과 검토 중심으로 접근하는 것이 좋습니다.",
        role: "이동 중 빠르게 확인하고 수정하고 공유해야 하는 사용자",
        steps: [
          "sidebar에서 대상 문서를 엽니다.",
          "toolbar와 More로 작은 수정만 처리합니다.",
          "변경을 확인한 뒤 share 또는 export로 전달합니다.",
        ],
        summary: "빠른 검토와 전달이 필요한 모바일 사용에 가장 현실적인 흐름입니다.",
        title: "모바일 빠른 수정과 공유",
      },
    ],
    scenarioTitle: "실제 사용 시나리오",
    visualTourDescription: "주요 작업 구역을 먼저 이해하면 나머지 기능도 훨씬 빠르게 따라갈 수 있습니다.",
    visualTourImageAlt: "업데이트된 Docsy 편집기 화면",
    visualTourItems: [
      {
        description: "문서를 열고, 바꾸고, 새 문서를 시작하는 기본 진입점입니다. 모바일에서는 이 제목을 눌러 sidebar를 닫을 수도 있습니다.",
        title: "파일 탐색기",
        x: 2,
        y: 42,
      },
      {
        description: "현재 문서 이름, 확장자, 편집 모드와 workspace 상태를 확인하는 영역입니다.",
        title: "문서 정보와 상태",
        x: 34,
        y: 3.5,
      },
      {
        description: "구조와 서식을 빠르게 바꾸는 editor toolbar입니다.",
        title: "편집 툴바",
        x: 42,
        y: 8.5,
      },
      {
        description: "공유, Patch Review, AI, export 같은 상단 action이 모이는 곳입니다.",
        title: "상단 작업 영역",
        x: 88,
        y: 3.5,
      },
      {
        description: "리치 텍스트와 source-aware 동작이 만나는 기본 작성 surface입니다.",
        title: "문서 캔버스",
        x: 44,
        y: 22,
      },
    ],
    visualTourTitle: "화면으로 먼저 이해하는 Docsy",
    sections: [
      {
        audience: ["beginner"],
        bullets: [
          "Docsy는 local-first 편집과 review-first AI 유지보수를 결합한 워크플로우입니다.",
          "단일 문서 작성과 다중 문서 유지보수 흐름을 모두 지원합니다.",
          "고급 surface는 workspace 복잡도가 커질수록 가치가 커집니다.",
        ],
        id: "getting-started",
        steps: [
          "문서를 만들거나 엽니다.",
          "문서 형식에 맞는 편집 모드를 고릅니다.",
          "workspace가 복잡해질 때만 Knowledge, Graph, Patch Review를 엽니다.",
        ],
        summary: "Docsy는 가장 단순한 경로에서 시작하고, 필요할 때 graph, diagnostics, review 흐름으로 확장할 때 가장 잘 작동합니다.",
        title: "시작하기",
      },
      {
        audience: ["beginner"],
        bullets: [
          "템플릿은 구조화된 문서를 가장 빠르게 시작하는 방법입니다.",
          "Markdown, LaTeX, HTML은 rich-text 편집 흐름을 사용합니다.",
          "JSON과 YAML은 structured editing 흐름으로 다룹니다.",
        ],
        id: "first-document",
        steps: [
          "랜딩이나 editor에서 시작합니다.",
          "빈 문서 또는 템플릿을 선택합니다.",
          "문서 이름과 기본 섹션을 먼저 정리합니다.",
        ],
        summary: "대부분의 경우 template-first가 가장 안전한 시작입니다. 목적과 형식을 먼저 정하고 세부 내용을 채우는 편이 좋습니다.",
        title: "첫 문서 만들기",
      },
      {
        audience: ["beginner"],
        bullets: [
          "rich-text 편집기는 source와 WYSIWYG를 함께 유지합니다.",
          "toolbar는 자주 쓰는 구조와 서식 작업에 최적화되어 있습니다.",
          "document tools와 advanced blocks는 필요할 때만 열면 됩니다.",
        ],
        id: "basic-editing",
        steps: [
          "heading, list, block 구조를 먼저 만듭니다.",
          "table, caption, footnote 같은 richer element는 document tools로 추가합니다.",
          "JSON/YAML은 structured editor에서 직접 다룹니다.",
        ],
        summary: "기본 편집과 고급 삽입 도구를 분리해서 생각하면 편집 모델이 훨씬 단순해집니다.",
        title: "기본 편집",
      },
      {
        audience: ["beginner"],
        bullets: [
          "데스크톱에서는 shortcut으로 편집 속도를 크게 높일 수 있습니다.",
          "shortcut은 주로 rich-text editor에 적용됩니다.",
          "모바일에서는 toolbar와 More가 shortcut-heavy 흐름을 대체합니다.",
        ],
        id: "keyboard-shortcuts",
        steps: [
          "shortcut modal을 열어 현재 플랫폼 기준 modifier key를 확인합니다.",
          "undo, formatting, heading, alignment부터 익힙니다.",
          "모바일에서는 keyboard 대신 toolbar/More를 사용합니다.",
        ],
        summary: "shortcut은 생산성 도구이지만, 어떤 editor mode에서 동작하는지를 먼저 이해하는 것이 중요합니다.",
        title: "Keyboard shortcuts",
      },
      {
        audience: ["beginner"],
        bullets: [
          "autosave는 최근 상태를 자동으로 유지합니다.",
          "Version History는 snapshot을 열고 복원할 수 있게 해줍니다.",
          "patch apply 전후 상태를 비교할 때 특히 중요합니다.",
        ],
        id: "versioning-and-recovery",
        steps: [
          "sidebar에서 History 탭을 엽니다.",
          "최근 snapshot을 미리 보고 필요한 시점을 고릅니다.",
          "복원 후 이어서 작업합니다.",
        ],
        summary: "Version History는 단순 복구 기능이 아니라, patch 기반 변경을 추적하는 검토 도구이기도 합니다.",
        title: "Versioning and recovery",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Knowledge는 열린 문서를 기반으로 local index와 관련 문서 신호를 만듭니다.",
          "Graph는 source-target 관계와 issue chain을 시각적으로 추적하는 surface입니다.",
          "workspace가 커질수록 broad browsing보다 issue-driven graph entry가 더 효율적입니다.",
        ],
        id: "knowledge-and-graph",
        steps: [
          "먼저 Knowledge에서 impact, health, consistency, change monitoring을 봅니다.",
          "관계가 불명확하면 Graph를 엽니다.",
          "Graph에서 source 문서, target 문서, suggestion 흐름으로 이동합니다.",
        ],
        summary: "Knowledge와 Graph는 단순 검색 도구가 아니라, 문서가 왜 서로 영향을 주는지 설명해 주는 inspection surface입니다.",
        title: "Knowledge and graph",
      },
      {
        audience: ["beginner", "advanced"],
        bullets: [
          "AI 변경안은 문서에 직접 적용되지 않습니다.",
          "Patch Review는 patch count, confidence, provenance, source attribution을 보여줍니다.",
          "provenance gap이 있는 패치는 더 보수적으로 다뤄야 합니다.",
        ],
        id: "patch-review",
        steps: [
          "비교, 업데이트 제안, graph-driven action에서 Patch Review를 엽니다.",
          "원문과 제안 내용을 나란히 보고 metadata를 확인합니다.",
          "문서가 실제로 바뀌기 전에 명시적으로 수락 또는 거절합니다.",
        ],
        summary: "Patch Review는 Docsy의 안전 경계입니다. AI 변경이 human inspection을 우회하지 못하게 합니다.",
        title: "Patch Review",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Suggestion Queue는 여러 문서에 대한 후속 작업을 한 줄씩 관리합니다.",
          "queue item은 change monitoring, impact analysis, consistency drift에서 올 수 있습니다.",
          "retry, graph re-entry, review reopen이 모두 지원됩니다.",
        ],
        id: "multi-document-maintenance",
        steps: [
          "diagnostics에서 영향을 받은 문서 쌍을 queue에 넣습니다.",
          "ready item을 Patch Review에서 하나씩 처리합니다.",
          "실패 항목은 retry하고, 더 확인이 필요하면 graph로 다시 들어갑니다.",
        ],
        summary: "하나의 source가 여러 target에 영향을 줄 때는 inline 수정보다 queue 기반 검토가 훨씬 안전합니다.",
        title: "Multi-document maintenance",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Google Workspace는 실제 Google Docs를 local review 흐름 안으로 가져옵니다.",
          "rescan과 refresh는 remote 변경을 sync 이전에 보이게 만듭니다.",
          "conflict와 warning state는 숨겨진 예외가 아니라 제품 UI의 일부입니다.",
        ],
        id: "google-workspace-sync",
        steps: [
          "Google Workspace를 연결하고 Drive Import로 문서를 가져옵니다.",
          "remote 변경이 의심되면 rescan을 실행합니다.",
          "stale import는 refresh하고, conflict나 warning badge를 review workflow의 일부로 다룹니다.",
        ],
        summary: "Google Workspace integration은 source of truth가 local editor 밖에 있을 때 중요합니다. Docsy는 remote change visibility와 sync safety를 review 흐름 안으로 가져옵니다.",
        title: "Google Workspace and sync state",
      },
      {
        audience: ["beginner"],
        bullets: [
          "share link와 QR은 빠른 전달용입니다.",
          "export는 결과 형식 자체가 중요할 때 선택합니다.",
          "전달 전에 patch-review와 format 상태를 확인하는 편이 더 안전합니다.",
        ],
        id: "share-and-export",
        steps: [
          "live share와 export 중 목적에 맞는 전달 방식을 고릅니다.",
          "가벼운 접근이면 share link / QR을 사용합니다.",
          "파일 결과물이 중요하면 export를 선택합니다.",
        ],
        summary: "공유와 export는 마지막 단계입니다. 문서가 복잡할수록 전달 전에 review 상태를 확인하는 가치가 더 커집니다.",
        title: "Share and export",
      },
      {
        audience: ["advanced"],
        bullets: [
          "Patch Review, Suggestion Queue, 공유/내보내기는 handoff 전에 함께 확인해야 합니다.",
          "Google Workspace warning과 conflict 상태는 전달 가능 상태로 보기 전에 정리해야 합니다.",
          "workspace가 커질수록 넓게 훑기보다 queue backlog와 graph 진입 지점을 중심으로 닫는 편이 안전합니다.",
        ],
        id: "operations-and-release",
        steps: [
          "queue와 review backlog를 정리하고 sync warning이나 conflict를 해소합니다.",
          "대상 문서가 실제로 업데이트되었는지, 아니면 의도적으로 보류했는지 확인합니다.",
          "검토 상태를 이해한 뒤 share 또는 export로 전달합니다.",
        ],
        summary: "handoff 품질은 여전히 제품에서 확인할 수 있지만, 이제는 전용 release gate 패널이 아니라 review, queue, sync, export surface를 함께 읽어 판단합니다.",
        title: "전달 준비와 handoff 점검",
      },
      {
        audience: ["beginner"],
        bullets: [
          "모바일은 desktop보다 navigation과 editing surface가 더 압축됩니다.",
          "고급 도구는 More나 drawer형 UI로 이동합니다.",
          "dense desktop layout을 복제하기보다 접근 가능한 action을 보존하는 데 초점을 둡니다.",
        ],
        id: "mobile-usage",
        steps: [
          "파일 탐색기 제목으로 모바일 sidebar를 닫습니다.",
          "핵심 action은 toolbar, 확장 도구는 More에서 엽니다.",
          "keyboard-heavy 흐름 대신 toolbar/More/sidebar panel 조합으로 작업합니다.",
        ],
        summary: "모바일은 desktop과 같은 모델을 유지하지만, 더 압축된 navigation과 지연 노출 도구를 사용합니다.",
        title: "Mobile usage tips",
      },
    ],
  },
  landing: {
    ctaDescription: "긴 기능 목록보다, 실제 작업 순서로 정리된 가이드를 보면 Docsy의 현재 제품 모델을 더 빠르게 이해할 수 있습니다.",
    ctaTitle: "기능 홍보보다 실제 사용 가이드가 필요하신가요?",
    featureCards: [
      {
        description: "반복되는 문서를 빠르게 시작하게 해주는 가장 효율적인 출발점입니다.",
        title: "Templates",
        useWhen: "runbook, handover, report, spec처럼 구조가 반복되는 문서를 시작할 때",
      },
      {
        description: "최근 local snapshot을 기준으로 복구와 비교를 지원하는 surface입니다.",
        title: "Version History",
        useWhen: "잘못된 변경을 되돌리거나 patch 적용 전후 상태를 비교할 때",
      },
      {
        description: "관련 문서, health, consistency, change 신호를 모아 보는 첫 번째 workspace surface입니다.",
        title: "Knowledge",
        useWhen: "문서를 바꾸기 전에 어떤 문서가 연결돼 있는지 이해해야 할 때",
      },
      {
        description: "source-target 경로와 영향 관계를 시각적으로 추적하는 route입니다.",
        title: "Graph",
        useWhen: "consistency나 impact 이슈가 왜 생겼는지 추적해야 할 때",
      },
      {
        description: "AI가 제안한 변경을 confidence와 provenance 기준으로 검토하는 안전 경계입니다.",
        title: "Patch Review",
        useWhen: "AI 제안을 적용하기 전에 근거와 신뢰도를 확인해야 할 때",
      },
      {
        description: "여러 문서에 걸친 후속 작업을 순서대로 처리하는 queue surface입니다.",
        title: "Suggestion Queue",
        useWhen: "하나의 source 문서가 여러 target 문서를 밀어내는 유지보수 작업을 다룰 때",
      },
      {
        description: "Google Docs import, rescan, refresh, conflict, warning state를 포함한 실연동 layer입니다.",
        title: "Google Workspace",
        useWhen: "source of truth가 Google Docs에 있거나 외부와 공유된 문서를 유지보수할 때",
      },
      {
        description: "review 이후 share link, QR, print, file export로 결과를 전달하는 마지막 단계입니다.",
        title: "공유와 내보내기",
        useWhen: "검토한 변경 결과를 handoff하거나 배포해야 할 때",
      },
    ],
    featureDescription: "중요한 것은 기능 이름이 아니라 지금 작업 단계에 어떤 surface가 맞는지를 아는 것입니다.",
    featureEyebrow: "맞는 surface를 고르기",
    featureTitle: "어느 단계에서 어떤 기능을 써야 하나요?",
    quickStartDescription: "처음 세션에서는 문서를 만들고, 변경을 안전하게 검토하고, 결과를 전달하는 세 가지 흐름만 이해하면 충분합니다.",
    quickStartEyebrow: "빠른 시작",
    quickStartSteps: [
      {
        description: "빈 문서나 템플릿으로 시작하고, 먼저 맞는 document mode를 선택합니다.",
        detail: "문서 종류를 알고 있다면 template-first가 가장 빠른 진입입니다.",
        title: "문서 만들기",
      },
      {
        description: "문서를 작성하되 AI 변경은 Patch Review에서 검토하고 바로 적용하지 않습니다.",
        detail: "Docsy는 review-first mutation을 기본으로 설계되었습니다.",
        title: "편집과 검토",
      },
      {
        description: "workspace가 커지면 Knowledge, Graph, Queue로 관련 문서를 관리한 뒤 share 또는 export로 전달합니다.",
        detail: "이 지점부터 Docsy는 단일 파일 편집기를 넘어 문서 유지보수 워크플로우가 됩니다.",
        title: "관련 작업 추적과 전달",
      },
    ],
    quickStartTitle: "시작할 때 필요한 핵심 개념은 세 가지뿐입니다",
    workflowCards: [
      {
        description: "template과 rich-text editing으로 문서를 빠르게 시작합니다.",
        emphasis: "첫 초안",
        title: "만들고 작성하기",
      },
      {
        description: "AI가 만든 변경을 문서에 넣기 전에 Patch Review에서 명시적으로 검토합니다.",
        emphasis: "Review-first",
        title: "안전하게 변경 검토하기",
      },
      {
        description: "Knowledge와 Graph로 관련 문서, 이슈 체인, source-target 경로를 추적합니다.",
        emphasis: "관계 추적",
        title: "문서 영향 이해하기",
      },
      {
        description: "영향받은 target 문서를 queue 순서대로 처리하고 retry와 graph re-entry를 사용합니다.",
        emphasis: "Queue orchestration",
        title: "여러 문서 유지보수하기",
      },
      {
        description: "Google Docs를 가져오고 remote change를 rescan하며 conflict와 warning 상태를 관리합니다.",
        emphasis: "Shared source of truth",
        title: "Google Workspace와 동기화하기",
      },
      {
        description: "queue와 review backlog를 정리하고 Google Workspace warning을 확인한 뒤 share 또는 export로 전달합니다.",
        emphasis: "전달 준비",
        title: "전달 준비하기",
      },
    ],
    workflowDescription: "Docsy는 편집기에서 시작하지만, review, traceability, workspace sync, 안전한 handoff가 workflow 안에 들어올 때 가장 가치가 커집니다.",
    workflowEyebrow: "핵심 워크플로우",
    workflowTitle: "기능이 아니라 흐름으로 생각하세요",
  },
};

const replaceGuideSection = (sections: GuideSection[], nextSection: GuideSection): GuideSection[] =>
  sections.map((section) => (section.id === nextSection.id ? nextSection : section));

const enGuideSectionsLatest = [
  {
    audience: ["beginner"] as GuideAudience[],
    bullets: [
      "Templates are still the fastest way to start structured writing.",
      "The header format dropdown is now the single place for switching Markdown, LaTeX, and HTML within the current document.",
      "JSON and YAML stay in a separate structured family, so cross-family actions create a new document instead of converting the current one in place.",
    ],
    id: "first-document",
    steps: [
      "Open the editor from landing.",
      "Start from a blank file or a template.",
      "Use the header format dropdown to confirm whether the document should stay in rich text or move into a separate structured document flow.",
    ],
    summary: "The first decision is no longer only which template to pick. The current build also expects users to choose the right document family early, using the top format dropdown as the control point.",
    title: "Create your first document",
  },
  {
    audience: ["beginner"] as GuideAudience[],
    bullets: [
      "Rich-text editors keep source and WYSIWYG in sync.",
      "Use the header format dropdown when you want to stay inside the current rich-text family without hunting through button groups.",
      "Document tools and advanced blocks can stay hidden until they are needed.",
    ],
    id: "basic-editing",
    steps: [
      "Start with headings, lists, and block structure.",
      "Use the header dropdown for Markdown, LaTeX, and HTML switches that should happen inside the current document.",
      "Use document tools for richer elements like tables, captions, and footnotes, and structured editors directly for JSON or YAML.",
    ],
    summary: "Basic editing now has a clearer split: the top dropdown handles mode choice, the toolbar handles structure and formatting, and advanced insert tools stay optional.",
    title: "Basic editing",
  },
  {
    audience: ["beginner", "advanced"] as GuideAudience[],
    bullets: [
      "AI changes still never mutate the document directly.",
      "Patch Review exposes patch count, confidence, provenance, and source attribution.",
      "If the active document came from Google Docs, sync warnings also surface here so lossy round-trips stay visible during review.",
    ],
    id: "patch-review",
    steps: [
      "Open Patch Review from comparison, update suggestions, or graph-driven actions.",
      "Inspect original vs suggested changes, metadata, and any workspace sync warning summary that appears above the diff.",
      "Treat provenance gaps, sync warnings, or low-confidence patches as reasons to slow down before accepting.",
    ],
    summary: "Patch Review is still the safety boundary, but it now also carries workspace-sync risk forward so reviewers can see fidelity warnings at the same moment they inspect AI changes.",
    title: "Patch Review",
  },
  {
    audience: ["advanced"] as GuideAudience[],
    bullets: [
      "Connect Google, import Docs, and keep the local review workflow as the control point.",
      "Rescan and refresh make remote changes visible before sync and patch application.",
      "\"Synced with warnings\" and conflict state are first-class UI states, not diagnostics hidden behind logs.",
    ],
    id: "google-workspace-sync",
    steps: [
      "Connect Google Workspace and import the target Google Doc.",
      "Use rescan when the upstream Google Doc may have changed remotely and inspect Change Monitoring or Queue state before syncing.",
      "Refresh stale imports and treat warning or conflict badges as blockers until review catches up.",
    ],
    summary: "Google Workspace integration is no longer just about importing a file. The current build makes remote change visibility, conflict handling, and fidelity warnings part of the same review-first maintenance workflow.",
    title: "Google Workspace and sync state",
  },
  {
    audience: ["advanced"] as GuideAudience[],
    bullets: [
      "Patch Review, Suggestion Queue, and sharing/export should be read together before handoff.",
      "Google Workspace warnings or conflicts should be resolved before calling the current state deliverable.",
      "As work scales, close the actual queue and review backlog before sharing results.",
    ],
    id: "operations-and-release",
    steps: [
      "Finish queued reviews and resolve sync warnings or conflicts.",
      "Confirm the target docs are updated or intentionally deferred.",
      "Share or export only after the review state is understood.",
    ],
    summary: "Handoff quality remains visible in the product, but it now comes from review, queue, sync, and export surfaces rather than a dedicated release gate panel.",
    title: "Handoff and delivery readiness",
  },
] satisfies GuideSection[];

const koGuideSectionsLatest = [
  {
    audience: ["beginner"] as GuideAudience[],
    bullets: [
      "템플릿은 여전히 문서를 가장 빨리 시작하는 방법입니다.",
      "상단 양식 드롭다운은 이제 현재 문서 안에서 Markdown, LaTeX, HTML을 전환하는 기본 위치입니다.",
      "JSON과 YAML은 구조화 계열로 분리되어 있어서, 다른 계열로 바꿀 때는 현재 문서를 직접 변환하지 않고 새 문서를 만드는 흐름으로 들어갑니다.",
    ],
    id: "first-document",
    steps: [
      "랜딩에서 편집기로 들어갑니다.",
      "빈 문서나 템플릿으로 시작합니다.",
      "상단 양식 드롭다운으로 이 문서가 리치 텍스트에 남을지, 구조화 문서로 분리될지를 먼저 결정합니다.",
    ],
    summary: "첫 문서에서는 템플릿만이 아니라 문서 계열 선택도 중요합니다. 현재 빌드에서는 상단 양식 드롭다운이 그 판단의 기준점 역할을 합니다.",
    title: "첫 문서 만들기",
  },
  {
    audience: ["beginner"] as GuideAudience[],
    bullets: [
      "리치 텍스트 편집기는 source와 WYSIWYG를 함께 유지합니다.",
      "상단 양식 드롭다운은 기존 버튼 묶음 대신 같은 리치 텍스트 계열 전환을 담당합니다.",
      "문서 도구와 고급 블록은 필요할 때만 열어도 됩니다.",
    ],
    id: "basic-editing",
    steps: [
      "heading, list, block 구조부터 잡습니다.",
      "현재 문서 안에서 Markdown, LaTeX, HTML을 바꿔야 할 때는 상단 드롭다운을 사용합니다.",
      "table, caption, footnote 같은 요소는 document tools에서 넣고, JSON/YAML은 구조화 편집기로 직접 다룹니다.",
    ],
    summary: "기본 편집 흐름은 더 분명해졌습니다. 상단 드롭다운은 모드 선택, 툴바는 구조와 서식, 고급 삽입 도구는 선택 기능으로 나뉩니다.",
    title: "기본 편집",
  },
  {
    audience: ["beginner", "advanced"] as GuideAudience[],
    bullets: [
      "AI 변경안은 여전히 문서에 직접 적용되지 않습니다.",
      "Patch Review에서는 patch count, confidence, provenance, source attribution을 함께 확인합니다.",
      "현재 문서가 Google Docs에서 왔다면 sync warning도 여기서 같이 보여서 손실 가능성을 검토 단계에서 바로 볼 수 있습니다.",
    ],
    id: "patch-review",
    steps: [
      "비교, 업데이트 제안, graph 기반 액션에서 Patch Review를 엽니다.",
      "원본과 제안 diff뿐 아니라 메타데이터와 workspace sync warning summary도 함께 확인합니다.",
      "provenance gap, sync warning, low confidence가 있으면 수락 전에 한 번 더 천천히 검토합니다.",
    ],
    summary: "Patch Review는 여전히 안전 경계입니다. 최근 변경으로는 Google Workspace 동기화 위험도 같은 화면에서 이어서 보이기 때문에, 검토 시점에 fidelity 위험을 놓치지 않게 됐습니다.",
    title: "Patch Review",
  },
  {
    audience: ["advanced"] as GuideAudience[],
    bullets: [
      "Google을 연결하고 문서를 가져오더라도 제어 지점은 여전히 로컬 review workflow에 있습니다.",
      "rescan과 refresh는 remote 변경을 sync와 patch apply 이전에 보이게 만듭니다.",
      "`Synced with warnings`와 conflict 상태는 로그 뒤에 숨는 예외가 아니라 UI에서 직접 드러나는 상태입니다.",
    ],
    id: "google-workspace-sync",
    steps: [
      "Google Workspace를 연결하고 대상 Google Doc를 import합니다.",
      "upstream Google Doc가 바뀌었을 수 있으면 rescan을 실행하고 Change Monitoring이나 Queue 상태를 먼저 봅니다.",
      "stale import는 refresh하고, warning이나 conflict badge가 남아 있으면 review가 따라잡기 전까지 blocker로 취급합니다.",
    ],
    summary: "Google Workspace 연동은 더 이상 단순 import 기능이 아닙니다. 현재 빌드는 remote change visibility, conflict 처리, fidelity warning을 review-first 유지보수 흐름 안으로 가져옵니다.",
    title: "Google Workspace와 동기화 상태",
  },
  {
    audience: ["advanced"] as GuideAudience[],
    bullets: [
      "Patch Review, Suggestion Queue, 공유/내보내기는 handoff 전에 함께 읽어야 합니다.",
      "Google Workspace warning이나 conflict는 현재 상태를 deliverable로 보기 전에 해소해야 합니다.",
      "작업 규모가 커질수록 결과를 공유하기 전에 실제 queue와 review backlog를 닫는 편이 안전합니다.",
    ],
    id: "operations-and-release",
    steps: [
      "queue와 review backlog를 정리하고 sync warning이나 conflict를 해소합니다.",
      "대상 문서가 실제로 업데이트되었는지, 아니면 의도적으로 보류했는지 확인합니다.",
      "검토 상태를 이해한 뒤 share 또는 export로 전달합니다.",
    ],
    summary: "handoff 품질은 여전히 제품에서 보이지만, 이제는 review, queue, sync, export surface를 함께 읽어 판단합니다.",
    title: "전달 준비와 handoff 점검",
  },
] satisfies GuideSection[];

const enGuideContentLatest: GuideContent = {
  ...enGuideContent,
  guidePage: {
    ...enGuideContent.guidePage,
    faqItems: [
      ...enGuideContent.guidePage.faqItems,
      {
        answer: "The top dropdown switches Markdown, LaTeX, and HTML inside the current document family. Choosing JSON or YAML should be treated as a new structured-document flow rather than an in-place conversion of the active rich-text document.",
        question: "How does the format dropdown work?",
      },
    ],
    sections: enGuideSectionsLatest.reduce(replaceGuideSection, enGuideContent.guidePage.sections),
    visualTourDescription: "Start with the zones that changed most recently: the unified format dropdown in the header, the editing toolbar, the review entry points, and the main canvas. Once those are familiar, the rest of the workspace surfaces become easier to follow.",
    visualTourItems: [
      enGuideContent.guidePage.visualTourItems[0],
      {
        description: "This header area now holds a single format dropdown. Switch Markdown, LaTeX, and HTML here, and use the same menu to branch into a new JSON or YAML document when structured editing is the better fit.",
        title: "Document info and format dropdown",
        x: 34,
        y: 3.5,
      },
      enGuideContent.guidePage.visualTourItems[2],
      enGuideContent.guidePage.visualTourItems[3],
      enGuideContent.guidePage.visualTourItems[4],
    ],
  },
  landing: {
    ...enGuideContent.landing,
    featureCards: enGuideContent.landing.featureCards.map((card) => {
      if (card.title === "Google Workspace") {
        return {
          ...card,
          description: "A live Drive Import and sync layer for Google Docs with search, refresh, conflict handling, and warning state that now remains visible during review.",
          useWhen: "The document source of truth lives in Google Docs and you need Drive Import plus warning or conflict state to stay visible while reviewing changes.",
        };
      }

      if (card.title === "Share and export") {
        return {
          ...card,
          description: "A delivery surface for share links, QR, print, and file export after review or sync checks are complete.",
          useWhen: "You are handing off reviewed documents or publishing an exported result.",
        };
      }

      return card;
    }),
    quickStartSteps: enGuideContent.landing.quickStartSteps.map((step, index) => (
      index === 0
        ? {
          ...step,
          detail: "Use the header format dropdown to confirm whether the document stays in rich text or becomes a separate structured document.",
        }
        : step
    )),
    workflowCards: enGuideContent.landing.workflowCards.map((card) => {
      if (card.title === "Create and write") {
        return {
          ...card,
          description: "Start a document quickly with templates, the header format dropdown, and rich-text editing.",
        };
      }

      if (card.title === "Sync with Google Workspace") {
        return {
          ...card,
          description: "Open Drive Import, search and import Google Docs, rescan remote changes, refresh stale copies, and keep warning or conflict state visible while reviewed patches are still pending.",
        };
      }

      if (card.title === "Prepare handoff") {
        return {
          ...card,
          description: "Use queue, Patch Review, and sync warnings to decide when the result is ready to share or export.",
        };
      }

      return card;
    }),
  },
};

const koGuideContentLatest: GuideContent = {
  ...koGuideContentNormalized,
  guidePage: {
    ...koGuideContentNormalized.guidePage,
    faqItems: [
      ...koGuideContentNormalized.guidePage.faqItems,
      {
        answer: "상단 드롭다운에서는 같은 계열의 Markdown, LaTeX, HTML을 현재 문서 안에서 전환합니다. JSON이나 YAML은 현재 리치 텍스트 문서를 직접 변환하는 방식이 아니라, 별도의 구조화 문서 흐름으로 들어간다고 이해하면 됩니다.",
        question: "상단 양식 드롭다운은 어떻게 동작하나요?",
      },
    ],
    sections: koGuideSectionsLatest.reduce(replaceGuideSection, koGuideContentNormalized.guidePage.sections),
    visualTourDescription: "최근 빌드에서 가장 자주 바뀐 표면은 상단 양식 드롭다운, 편집 툴바, review 진입점, 메인 캔버스입니다. 이 구역들만 먼저 익혀도 나머지 workspace surface를 따라가기가 훨씬 쉬워집니다.",
    visualTourItems: [
      koGuideContentNormalized.guidePage.visualTourItems[0],
      {
        description: "이제 상단 헤더에는 단일 양식 드롭다운이 있습니다. 여기서 Markdown, LaTeX, HTML을 전환하고, 필요하면 같은 메뉴에서 JSON이나 YAML 새 문서 흐름으로 넘어갑니다.",
        title: "문서 정보와 양식 드롭다운",
        x: 34,
        y: 3.5,
      },
      koGuideContentNormalized.guidePage.visualTourItems[2],
      koGuideContentNormalized.guidePage.visualTourItems[3],
      koGuideContentNormalized.guidePage.visualTourItems[4],
    ],
  },
  landing: {
    ...koGuideContentNormalized.landing,
    featureCards: koGuideContentNormalized.landing.featureCards.map((card) => {
      if (card.title === "Google Workspace") {
        return {
          ...card,
          description: "Google Docs를 review 흐름 안으로 가져오는 Drive Import/sync 계층으로, 검색, refresh, conflict, warning 상태가 검토 단계에서도 계속 보입니다.",
          useWhen: "문서의 source of truth가 Google Docs에 있고, Drive Import와 warning/conflict 상태를 review 중에도 놓치면 안 될 때 사용합니다.",
        };
      }

      if (card.title === "공유와 내보내기") {
        return {
          ...card,
          description: "review와 sync 확인이 끝난 뒤 share link, QR, print, file export로 결과를 전달하는 단계입니다.",
          useWhen: "검토가 끝난 문서를 handoff하거나 export 결과를 배포해야 할 때 사용합니다.",
        };
      }

      return card;
    }),
    quickStartSteps: koGuideContentNormalized.landing.quickStartSteps.map((step, index) => (
      index === 0
        ? {
          ...step,
          detail: "상단 양식 드롭다운으로 이 문서가 리치 텍스트에 남을지, 구조화 문서로 분리될지를 먼저 확인합니다.",
        }
        : step
    )),
    workflowCards: koGuideContentNormalized.landing.workflowCards.map((card) => {
      if (card.title === "Create and write") {
        return {
          ...card,
          description: "템플릿, 상단 양식 드롭다운, 리치 텍스트 편집을 기준으로 문서를 빠르게 시작합니다.",
        };
      }

      if (card.title === "Sync with Google Workspace") {
        return {
          ...card,
          description: "Drive Import로 Google Docs를 검색·import하고 remote change를 rescan하며, stale copy를 refresh하고, warning이나 conflict 상태를 reviewed patch가 남아 있는 동안에도 계속 추적합니다.",
        };
      }

      if (card.title === "전달 준비하기") {
        return {
          ...card,
          description: "queue, Patch Review, sync warning 상태를 함께 보면서 share 또는 export 시점을 판단합니다.",
        };
      }

      return card;
    }),
  },
};

export const getGuideContent = (locale: Locale): GuideContent =>
  locale === "ko" ? koGuideContentLatest : enGuideContentLatest;
