import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, X, Lightbulb } from 'lucide-react'
import { PAGE_GUIDES } from './pageGuides'
import type { GuideKey } from './pageGuides'
import './PageGuide.css'

interface PageGuideProps {
  page: GuideKey
  /** 'corner' pins the button to the top-right of a positioned hero; 'inline' flows with siblings */
  placement?: 'corner' | 'inline'
}

/**
 * A "?" button that opens a short guide for the current page.
 * Uses the native <dialog> element for focus handling and Escape to close.
 */
const PageGuide = ({ page, placement = 'corner' }: PageGuideProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const guide = PAGE_GUIDES[page]
  const titleId = `page-guide-title-${page}`

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type="button"
        className={`page-guide-btn ${placement}`}
        onClick={open}
        aria-label={`How to use ${guide.title}`}
        title="How to use this page"
      >
        <HelpCircle size={18} />
        <span>Guide</span>
      </button>

      {/* Rendered at body level so page styles (e.g. hero headings) don't leak in */}
      {createPortal(<dialog
        ref={dialogRef}
        className="page-guide-dialog"
        aria-labelledby={titleId}
        onClick={(e) => {
          // Close when the backdrop (the dialog element itself) is clicked
          if (e.target === e.currentTarget) close()
        }}
      >
        <div className="page-guide-body">
          <div className="page-guide-header">
            <div className="page-guide-icon">
              <HelpCircle size={20} />
            </div>
            <h2 id={titleId}>{guide.title}</h2>
            <button type="button" className="page-guide-close" onClick={close} aria-label="Close guide" autoFocus>
              <X size={18} />
            </button>
          </div>

          <p className="page-guide-intro">{guide.intro}</p>

          {guide.sections.map(section => (
            <section key={section.heading} className="page-guide-section">
              <h3>{section.heading}</h3>
              <ul>
                {section.items.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          {guide.tip && (
            <div className="page-guide-tip">
              <Lightbulb size={16} />
              <span>{guide.tip}</span>
            </div>
          )}

          <p className="page-guide-disclaimer">
            Educational tool only - not financial advice.
          </p>
        </div>
      </dialog>, document.body)}
    </>
  )
}

export default PageGuide
