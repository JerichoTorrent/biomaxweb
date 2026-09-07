/**
 * The one JavaScript island in the project (astro-conventions: island policy).
 *
 * Pointer events on the frame drive the reveal (tap anywhere to jump, drag
 * anywhere, pointer capture keeps the drag while the finger wanders), per
 * the brand components spec: a pointer handler and a CSS clip-path is the
 * whole implementation. The real <input type="range"> remains as the
 * keyboard and screen-reader surface (arrow keys, slider semantics) but no
 * longer intercepts pointers, because native range inputs on mobile only
 * respond when the touch starts exactly on the thumb.
 *
 * No drag library, no re-renders while dragging. Authored as a React
 * component; rendered through preact/compat (see astro.config.mjs).
 */
import { useEffect, useRef } from 'react';
import './BeforeAfterSlider.css';

export interface ImageSet {
  avifSrcset: string;
  webpSrcset: string;
  src: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
}

interface Props {
  before: ImageSet;
  after: ImageSet;
  /** Accessible name — distinguish multiple sliders on one page */
  label?: string;
  /** Starting reveal position, percent of width */
  initial?: number;
}

function Pic({ set, className }: { set: ImageSet; className?: string }) {
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={set.avifSrcset} sizes={set.sizes} />
      <source type="image/webp" srcSet={set.webpSrcset} sizes={set.sizes} />
      <img
        src={set.src}
        width={set.width}
        height={set.height}
        alt={set.alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

export default function BeforeAfterSlider({
  before,
  after,
  label = 'Reveal after image',
  initial = 50,
}: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  const apply = (pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct));
    frame.current?.style.setProperty('--pos', `${clamped}%`);
    if (range.current) range.current.value = String(Math.round(clamped));
  };

  const fromClientX = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    apply(((clientX - rect.left) / rect.width) * 100);
  };

  // If the input was moved before hydration finished, sync the clip position
  // to its actual value once listeners attach.
  useEffect(() => {
    const v = range.current?.value;
    if (v != null) frame.current?.style.setProperty('--pos', `${v}%`);
  }, []);

  const onPointerDown = (e: {
    pointerId: number;
    clientX: number;
    button: number;
    currentTarget: HTMLDivElement;
    preventDefault: () => void;
  }) => {
    if (e.button !== 0) return;
    e.preventDefault(); // stops native image drag and text selection
    dragging.current = true;
    fromClientX(e.clientX); // position first — a failed capture must not eat the tap
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is an enhancement for drags that wander off the frame */
    }
  };

  const onPointerMove = (e: { clientX: number }) => {
    if (dragging.current) fromClientX(e.clientX);
  };

  const endDrag = () => {
    dragging.current = false;
  };

  const onInput = (e: { currentTarget: HTMLInputElement }) => {
    frame.current?.style.setProperty('--pos', `${e.currentTarget.value}%`);
  };

  return (
    <div
      className="ba"
      ref={frame}
      style={`--pos: ${initial}%; aspect-ratio: ${before.width} / ${before.height};`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Pic set={before} className="ba__img" />
      <Pic set={after} className="ba__img ba__img--after" />
      <div className="ba__handle" aria-hidden="true">
        <span className="ba__grip">
          {/* the brand helix as the grip glyph */}
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2c0 5 8 7 8 10s-8 5-8 10" />
            <path d="M16 2c0 5-8 7-8 10s8 5 8 10" />
            <path d="M8.6 4.5h6.8" />
            <path d="M10.4 7.5h3.2" />
            <path d="M10.4 16.5h3.2" />
            <path d="M8.6 19.5h6.8" />
          </svg>
        </span>
      </div>
      <span className="ba__tag ba__tag--before" aria-hidden="true">
        Before
      </span>
      <span className="ba__tag ba__tag--after" aria-hidden="true">
        After
      </span>
      <input
        className="ba__range"
        ref={range}
        type="range"
        min="0"
        max="100"
        step="1"
        defaultValue={initial}
        aria-label={label}
        onInput={onInput}
      />
    </div>
  );
}
