import React, { useState } from 'react';
import { Icon } from './site';

// Question/answer list in the design system's FAQ style (km-faq / km-q).
// items: [{ question, answer }]; one item open at a time.
export default function Accordion({ items, idPrefix = 'faq', defaultOpen = 0, className = '' }) {
  const [openIndex, setOpenIndex] = useState(defaultOpen);
  return (
    <div className={`km-faq ${className}`.trim()}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const id = `${idPrefix}-${index}`;
        return (
          <div key={item.question} className={`km-q${isOpen ? ' on' : ''}`}>
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                aria-expanded={isOpen}
                aria-controls={id}
              >
                {item.question}
                <Icon name={isOpen ? 'x' : 'plus'} size={18} />
              </button>
            </h3>
            {isOpen ? <p id={id}>{item.answer}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
