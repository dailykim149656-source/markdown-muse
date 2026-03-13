export const resumeLatexFixture = String.raw`% Resume
\documentclass[letterpaper,11pt]{article}
\usepackage[hidelinks]{hyperref}
\newcommand{\resumeSummary}[1]{
  \item #1
}
\newcommand{\resumeEmployment}[4]{
  \item #1 #2 #3 #4
}
\newcommand{\resumeProject}[2]{
  \item #1 #2
}
\newcommand{\resumeSkills}[1]{
  \item #1
}
\newcommand{\resumeEmploymentListStart}{\begin{itemize}[leftmargin=*]}
\newcommand{\resumeEmploymentListEnd}{\end{itemize}}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=*]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}}
\newcommand{\resumeItem}[1]{\item #1}
\begin{document}
\begin{tabular*}{\textwidth}{l@{\extracolsep{\fill}}r}
  \textbf{\href{https://example.com}{\Large Your Name}} & Github: your-id \\
  \href{https://example.com}{https://example.com} & Email : \href{mailto:you@example.com}{you@example.com} \\
  {} & Mobile : (+82) 010-1234-5678
\end{tabular*}

\section{Summary}
\resumeSummary{
My main interest lies at product engineering. \\
I enjoy high-clarity tools.
}

\section{Employment}
\resumeEmploymentListStart
\resumeEmployment
  {Docsy Labs}{Seoul, South Korea}
  {Senior Engineer}{Apr. 2021 - Present}
\resumeItemListStart
  \resumeItem{Built editor workflows.}
  \resumeItem{Owned release automation.}
\resumeItemListEnd
\resumeEmploymentListEnd

\section{Projects}
\resumeSubHeadingListStart
\resumeProject
  {Resume Importer}
  {Parsed LaTeX resumes into editable content}
\resumeItemListStart
  \resumeItem{Implemented parsing logic.}
\resumeItemListEnd
\resumeSubHeadingListEnd

\section{Skills}
\resumeSubHeadingListStart
\resumeSkills{\textbf{Programming} - TypeScript, Python}
\resumeSubHeadingListEnd

\section{Community}
\resumeSubHeadingListStart
\resumeCommunity
  {Open Source Seoul}{Seoul, South Korea}
  {Organizer}
\resumeItemListStart
  \resumeItem{Hosted monthly contributor sessions.}
\resumeItemListEnd
\resumeSubHeadingListEnd

\resumeItemListStart
  \resumeItem{orphan item should stay raw}
\resumeItemListEnd

\customunknown{keep me}
\end{document}
`;
