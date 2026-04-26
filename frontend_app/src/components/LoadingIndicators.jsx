import React from "react";
import { motion } from "framer-motion";

/**
 * 打字机光标效果组件
 * 用于流式输出时显示 AI 正在生成内容的视觉提示
 */
export default function TypingCursor({ isVisible = true, className = "" }) {
  if (!isVisible) {
    return null;
  }

  return (
    <motion.span
      className={`inline-block h-5 w-0.5 bg-blue-500 ${className}`}
      animate={{
        opacity: [1, 0, 1],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-label="正在生成中"
    />
  );
}

/**
 * 脉冲加载指示器
 * 用于表示 AI 正在思考或处理
 */
export function PulsingDot({ className = "", size = "md" }) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <motion.span
      className={`inline-block rounded-full bg-blue-500 ${sizeClasses[size]} ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.6, 1, 0.6],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-label="处理中"
    />
  );
}

/**
 * 三点加载动画
 * 经典的"..."加载效果
 */
export function ThreeDotsLoader({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="inline-block h-2 w-2 rounded-full bg-slate-400"
          animate={{
            y: [0, -8, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.15,
          }}
        />
      ))}
    </span>
  );
}

/**
 * 流式文本容器
 * 包含打字机光标的文本显示容器
 */
export function StreamingTextContainer({ children, isStreaming = false, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isStreaming && (
        <TypingCursor className="ml-1" />
      )}
    </div>
  );
}
