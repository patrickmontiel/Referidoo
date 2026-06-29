"use client";

import { useState } from "react";

type FaqItem = { question: string; answer: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-[#EFEFF1] border-y border-[#EFEFF1]">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question}>
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-bold text-[15px] text-[#0B0B0C]">{item.question}</span>
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#0B0B0C] transition-transform duration-200"
                style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            <div
              className="overflow-hidden transition-[max-height] duration-300 ease-out"
              style={{ maxHeight: open ? "20rem" : "0px" }}
            >
              <p className="text-[#5A626E] text-sm leading-relaxed pb-5 pr-10">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
