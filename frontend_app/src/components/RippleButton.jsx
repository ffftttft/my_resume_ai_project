import React, { useState } from "react";
import { motion } from "framer-motion";

/**
 * 带涟漪效果的按钮组件
 */
export default function RippleButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled) return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = {
      x,
      y,
      id: Date.now(),
    };

    setRipples((prev) => [...prev, newRipple]);

    // 移除涟漪效果
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  const variantClasses = {
    primary: "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700",
    secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400",
    outline: "border-2 border-blue-500 text-blue-500 hover:bg-blue-50 active:bg-blue-100",
    ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
    danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const baseClasses = "relative overflow-hidden rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {/* 涟漪效果 */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{
            width: 300,
            height: 300,
            opacity: 0,
            x: -150,
            y: -150,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}

      {/* 按钮内容 */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

/**
 * 图标按钮（圆形）
 */
export function IconButton({
  children,
  onClick,
  disabled = false,
  variant = "ghost",
  size = "md",
  className = "",
  ...props
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <RippleButton
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      className={`${sizeClasses[size]} !rounded-full !p-0 flex items-center justify-center ${className}`}
      {...props}
    >
      {children}
    </RippleButton>
  );
}
