import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function LiveJsonModal({
  open,
  title = "实时 JSON",
  subtitle = "",
  content = "",
  onClose,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="atelier-modal flex h-[min(84vh,52rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px]"
            initial={{ opacity: 0, scale: 0.98, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 18 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                  实时通道
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
                {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-white/20 hover:text-white"
                aria-label="关闭实时 JSON 弹窗"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 p-5">
              <pre className="custom-scrollbar h-full overflow-auto rounded-2xl border border-white/10 bg-black/25 p-5 font-mono text-xs leading-6 text-slate-100">
                {content || "暂无返回内容。"}
              </pre>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
