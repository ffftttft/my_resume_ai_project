import React from "react";

function scrollToSection(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function EditAnchorNav({ items = [] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <aside className="hidden xl:block xl:w-56 xl:shrink-0">
      <div className="atelier-anchor sticky top-6 p-3">
        <p className="atelier-anchor__label">目录</p>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="atelier-anchor__item"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                {item.meta ? <p className="mt-1 text-xs leading-5 text-gray-500">{item.meta}</p> : null}
              </div>
              <span className="atelier-anchor__index">{item.index}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
