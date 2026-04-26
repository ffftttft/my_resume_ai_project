const MULTILINE_SECTION_LABELS = [
  "个人总结",
  "个人简介",
  "自我评价",
  "职业概述",
  "个人优势",
];

const MULTILINE_SECTION_PATTERN = new RegExp(
  `^(${MULTILINE_SECTION_LABELS.join("|")})\\s*[：:-]\\s*(.+)$`,
);

function normalizeSectionLabelBlocks(text) {
  return (text || "")
    .split("\n")
    .flatMap((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return [""];
      }

      const match = line.match(MULTILINE_SECTION_PATTERN);
      if (!match) {
        return [rawLine];
      }

      const [, label, content] = match;
      const normalizedContent = (content || "").trim();
      return normalizedContent ? [label, "", normalizedContent] : [label];
    })
    .join("\n");
}

export function normalizeResumeText(text) {
  const normalized = (text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*([-*_]\s*){3,}$/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");

  return normalizeSectionLabelBlocks(normalized)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
