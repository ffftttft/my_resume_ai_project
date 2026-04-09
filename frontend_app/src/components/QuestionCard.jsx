import React, { useEffect, useMemo, useState } from "react";

function createTypedQuestions(questions) {
  return questions.map(() => "");
}

export default function QuestionCard({
  open,
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onSkip,
  onClose,
  loading,
  title = "生成时发现这些信息还不够具体",
  description = "回答后会再次生成简历，并把你的补充信息整合进去。",
  placeholder = "请输入这段经历更具体的职责、动作、结果或数据...",
}) {
  const [typedQuestions, setTypedQuestions] = useState(() => createTypedQuestions(questions));
  const joinedQuestions = useMemo(() => questions.join("||"), [questions]);

  useEffect(() => {
    if (!open) return undefined;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion) {
      setTypedQuestions(questions);
      return undefined;
    }

    setTypedQuestions(createTypedQuestions(questions));

    if (questions.length === 0) {
      return undefined;
    }

    let questionIndex = 0;
    let charIndex = 0;

    const timer = window.setInterval(() => {
      setTypedQuestions((previous) => {
        if (questionIndex >= questions.length) {
          window.clearInterval(timer);
          return previous;
        }

        const next = [...previous];
        const fullText = questions[questionIndex] || "";
        charIndex += 1;
        next[questionIndex] = fullText.slice(0, charIndex);

        if (charIndex >= fullText.length) {
          questionIndex += 1;
          charIndex = 0;
        }

        return next;
      });
    }, 16);

    return () => window.clearInterval(timer);
  }, [open, joinedQuestions, questions]);

  if (!open) return null;

  return (
    <div className="dialog-shell">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-dialog-title"
        aria-describedby="question-dialog-description"
        className="paper-panel-strong float-card question-dialog-shell"
      >
        <div className="question-dialog-shell__header">
          <div>
            <p className="question-dialog-shell__eyebrow">AI Follow-up</p>
            <h2 id="question-dialog-title" className="question-dialog-shell__title">
              {title}
            </h2>
            <p id="question-dialog-description" className="question-dialog-shell__description">
              {description}
            </p>
          </div>
          <button type="button" onClick={onClose} className="question-dialog-shell__close">
            关闭
          </button>
        </div>

        <div className="question-dialog-shell__body">
          {questions.map((question, index) => (
            <div key={question} className="question-block">
              <div className="question-block__head">
                <span className="question-block__index">{String(index + 1).padStart(2, "0")}</span>
                <p className="question-block__title">
                  {typedQuestions[index] || ""}
                  {(typedQuestions[index] || "").length < question.length ? (
                    <span className="question-block__cursor" />
                  ) : null}
                </p>
              </div>
              <textarea
                value={answers[question] || ""}
                onChange={(event) => onAnswerChange(question, event.target.value)}
                rows={4}
                className="field-shell w-full resize-y px-4 py-3 outline-none"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <div className="question-dialog-shell__actions">
          <button type="button" onClick={onClose} className="question-dialog-shell__secondary">
            稍后处理
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="question-dialog-shell__secondary"
          >
            跳过补充，保留当前版本
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="question-dialog-shell__primary"
          >
            {loading ? "更新中..." : "提交并重新生成"}
          </button>
        </div>
      </div>
    </div>
  );
}
