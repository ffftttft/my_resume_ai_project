import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Globe2, Radar, Search, X } from "lucide-react";

function formatDate(value) {
  if (!value) return "未提供时间";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function normalizeHost(url, fallback = "") {
  try {
    return new URL(url).hostname || fallback || "未知来源";
  } catch {
    return fallback || "未知来源";
  }
}

function getModeLabel(mode) {
  if (mode === "network") return "联网命中";
  if (mode === "cached") return "缓存命中";
  if (mode === "disabled") return "未启用联网";
  if (mode === "empty") return "未命中来源";
  if (mode === "error") return "搜索异常";
  return "待搜索";
}

export default function JobInsightDrawer({
  open,
  onClose,
  jobInsight,
  targetCompany = "",
  targetRole = "",
}) {
  const results = Array.isArray(jobInsight?.results) ? jobInsight.results : [];
  const headerTitle = [targetCompany?.trim(), targetRole?.trim()].filter(Boolean).join(" / ") || "岗位情报来源";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 bg-slate-950/38 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="job-insight-drawer flex flex-col overflow-hidden border border-gray-200 bg-slate-50 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-600">
                    联网来源
                  </p>
                  <h3 className="job-insight-drawer__title mt-2">{headerTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    这里会明确展示当前岗位情报的搜索 query、来源网址、缓存状态和发布时间。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
                  aria-label="关闭来源抽屉"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="job-insight-drawer__pill">
                  <Radar size={14} />
                  {jobInsight?.provider || "Tavily"}
                </span>
                <span className="job-insight-drawer__pill">{getModeLabel(jobInsight?.mode)}</span>
                <span className="job-insight-drawer__pill">
                  {jobInsight?.cached ? "已使用缓存" : "实时请求"}
                </span>
                <span className="job-insight-drawer__pill">
                  {results.length > 0 ? `${results.length} 条来源` : "暂无来源"}
                </span>
              </div>
            </div>

            <div className="job-insight-drawer__body min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-2">
                  <p className="job-insight-drawer__section-label">
                    <Search size={14} />
                    本次搜索 query
                  </p>
                  <p className="job-insight-drawer__query mt-3">
                    {jobInsight?.query || [targetCompany, targetRole].filter(Boolean).join(" ") || "暂无 query"}
                  </p>
                </section>

                {results.length > 0 ? (
                  results.map((item, index) => (
                    <article
                      key={`${item.url || item.title || "job-insight"}-${index}`}
                      className="job-insight-drawer__result rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="job-insight-drawer__result-title" title={item.title || "未命名来源"}>
                            {item.title || "未命名来源"}
                          </p>
                          <p className="job-insight-drawer__result-meta">
                            <Globe2 size={13} />
                            {normalizeHost(item.url, item.source)}
                          </p>
                        </div>
                        <span className="job-insight-drawer__score">
                          {typeof item.score === "number" ? `${Math.round(item.score * 100)}%` : "--"}
                        </span>
                      </div>

                      <p className="job-insight-drawer__result-snippet">
                        {item.snippet || "该来源未返回可展示的摘要内容。"}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="job-insight-drawer__pill">{formatDate(item.published_at)}</span>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="job-insight-drawer__link"
                          >
                            <ExternalLink size={14} />
                            打开网址
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm leading-6 text-gray-500 md:col-span-2">
                    {jobInsight?.warning || "当前还没有可展示的岗位来源，系统将只基于你填写的岗位信息继续执行。"}
                  </section>
                )}
              </div>

              {jobInsight?.warning ? (
                <p className="job-insight-drawer__warning mt-4">{jobInsight.warning}</p>
              ) : null}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
