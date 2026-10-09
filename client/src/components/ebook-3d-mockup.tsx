import type { CSSProperties } from "react";

export type Ebook3DMockupProps = {
  title: string;
  subtitle: string;
  coverArtSrc: string;
  primaryColor: string;
  paperColor: string;
  authorName: string;
  className?: string;
};

type MockupStyle = CSSProperties & {
  "--mockup-primary": string;
  "--mockup-paper": string;
};

export default function Ebook3DMockup({
  title,
  subtitle,
  coverArtSrc,
  primaryColor,
  paperColor,
  authorName,
  className = "",
}: Ebook3DMockupProps) {
  const style: MockupStyle = {
    "--mockup-primary": primaryColor,
    "--mockup-paper": paperColor,
  };

  return (
    <figure
      className={`ebook-proof ${className}`.trim()}
      style={style}
      aria-label={`Paperback proof${title ? `: ${title}` : ""}`}
    >
      <style>{`
        .ebook-proof {
          --proof-ink: #293b34;
          --proof-muted: #66746b;
          position: relative;
          isolation: isolate;
          width: 100%;
          overflow: hidden;
          border: 1px solid #d8d9cd;
          border-radius: 22px;
          background: #f1f0e8;
          color: var(--proof-ink);
          box-shadow: 0 12px 36px rgba(48, 58, 48, .055);
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        .ebook-proof *,
        .ebook-proof *::before,
        .ebook-proof *::after { box-sizing: border-box; }
        .ebook-proof__heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 19px 0;
        }
        .ebook-proof__eyebrow {
          margin: 0;
          color: #6a786c;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: .17em;
          line-height: 1.4;
          text-transform: uppercase;
        }
        .ebook-proof__mark {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #788176;
          font-size: 10px;
          font-weight: 650;
          letter-spacing: .09em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .ebook-proof__mark::before {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--mockup-primary);
          content: "";
        }
        .ebook-proof__stage {
          position: relative;
          display: grid;
          min-height: 390px;
          place-items: center;
          overflow: hidden;
          padding: 26px 24px 30px;
          perspective: 1150px;
        }
        .ebook-proof__stage::before {
          position: absolute;
          top: 50%;
          left: 50%;
          width: min(76vw, 330px);
          aspect-ratio: 1;
          border: 1px solid rgba(78, 101, 81, .11);
          border-radius: 50%;
          content: "";
          transform: translate(-50%, -50%);
        }
        .ebook-proof__stage::after {
          position: absolute;
          inset: 8px;
          z-index: -1;
          background-image: radial-gradient(rgba(66, 84, 68, .17) .7px, transparent .7px);
          background-position: center;
          background-size: 17px 17px;
          content: "";
          opacity: .2;
          mask-image: radial-gradient(ellipse at center, #000 8%, transparent 76%);
        }
        .ebook-proof__book {
          position: relative;
          z-index: 1;
          width: min(248px, 69%);
          aspect-ratio: 2 / 3;
          transform: rotateY(-16deg) rotateZ(-1.6deg);
          transform-style: preserve-3d;
          filter: drop-shadow(17px 23px 15px rgba(41, 47, 37, .19));
          transition: transform .45s cubic-bezier(.2, .75, .25, 1);
        }
        .ebook-proof__pages {
          position: absolute;
          inset: 1.3% -5.1% 1.1% 4.7%;
          overflow: hidden;
          border-radius: 2px 5px 5px 2px;
          background:
            repeating-linear-gradient(0deg, rgba(70, 62, 45, .095) 0 1px, transparent 1px 3px),
            linear-gradient(90deg, #c8c2b0 0%, var(--mockup-paper) 10%, #f5f1e6 82%, #d1cbb9 100%);
          box-shadow: inset -3px 0 4px rgba(91, 82, 65, .2), 3px 1px 0 #c8c1b1, 6px 2px 0 #bcb5a5;
          transform: translateZ(-7px);
        }
        .ebook-proof__pages::after {
          position: absolute;
          inset: 0 0 0 auto;
          width: 12%;
          background: linear-gradient(90deg, transparent, rgba(72, 65, 51, .16));
          content: "";
        }
        .ebook-proof__cover {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border: 1px solid rgba(38, 47, 37, .26);
          border-radius: 3px 2px 3px 3px;
          background: var(--mockup-primary);
          color: var(--mockup-paper);
          transform: translateZ(8px);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .12), 0 1px 2px rgba(37, 42, 35, .24);
        }
        .ebook-proof__cover::after {
          position: absolute;
          z-index: 4;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, rgba(255, 255, 255, .09), transparent 27%, transparent 76%, rgba(20, 28, 22, .12)),
            repeating-linear-gradient(0deg, rgba(255, 255, 255, .018) 0 1px, transparent 1px 3px);
          content: "";
        }
        .ebook-proof__spine {
          position: absolute;
          z-index: 5;
          top: 0;
          bottom: 0;
          left: 0;
          display: flex;
          width: 7.5%;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-right: 1px solid rgba(247, 240, 218, .24);
          background: linear-gradient(90deg, rgba(15, 27, 21, .28), rgba(15, 27, 21, .08) 68%, rgba(255, 255, 255, .08));
          box-shadow: inset -2px 0 2px rgba(26, 31, 25, .08);
        }
        .ebook-proof__spine-title {
          max-height: 91%;
          overflow: hidden;
          color: var(--mockup-paper);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 7px;
          font-weight: 600;
          letter-spacing: .09em;
          line-height: 1.25;
          text-align: center;
          text-overflow: ellipsis;
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
        }
        .ebook-proof__art-frame {
          position: absolute;
          top: 7%;
          right: 9%;
          left: 12%;
          height: 44%;
          overflow: hidden;
          border: 1px solid rgba(247, 240, 218, .34);
          background: rgba(247, 240, 218, .1);
          box-shadow: 0 3px 14px rgba(21, 31, 24, .12);
        }
        .ebook-proof__art {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .ebook-proof__type {
          position: absolute;
          z-index: 2;
          top: 54%;
          right: 9%;
          left: 12%;
          display: flex;
          max-height: 36%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          text-align: center;
        }
        .ebook-proof__title {
          display: -webkit-box;
          max-width: 100%;
          margin: 0;
          overflow: hidden;
          color: var(--mockup-paper);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(19px, 6.5cqw, 31px);
          font-weight: 500;
          letter-spacing: -.045em;
          line-height: .99;
          text-wrap: balance;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }
        .ebook-proof__subtitle {
          display: -webkit-box;
          max-width: 95%;
          margin: 8px 0 0;
          overflow: hidden;
          color: var(--mockup-paper);
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: clamp(8px, 2.25cqw, 10px);
          font-weight: 550;
          letter-spacing: .035em;
          line-height: 1.35;
          opacity: .86;
          text-wrap: balance;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .ebook-proof__author {
          position: absolute;
          z-index: 2;
          right: 10%;
          bottom: 4.1%;
          left: 12%;
          margin: 0;
          overflow: hidden;
          color: var(--mockup-paper);
          font-size: clamp(7px, 2cqw, 9px);
          font-weight: 650;
          letter-spacing: .18em;
          text-align: center;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .ebook-proof__caption {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px 16px;
          color: var(--proof-muted);
          font-size: 11px;
          letter-spacing: .02em;
          text-align: center;
        }
        .ebook-proof__caption::before,
        .ebook-proof__caption::after {
          width: 22px;
          height: 1px;
          background: #c7cabe;
          content: "";
        }
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .ebook-proof__stage:hover .ebook-proof__book {
            transform: rotateY(-11deg) rotateZ(0deg) translateY(-3px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ebook-proof__book { transition: none; }
        }
        @media (max-width: 420px) {
          .ebook-proof { border-radius: 17px; }
          .ebook-proof__heading { padding: 14px 15px 0; }
          .ebook-proof__stage { min-height: 350px; padding: 22px 12px 26px; }
          .ebook-proof__book { width: min(220px, 72%); }
          .ebook-proof__caption { padding-bottom: 13px; font-size: 10px; }
        }
        @media (min-width: 700px) {
          .ebook-proof__stage { min-height: 445px; }
          .ebook-proof__book { width: min(270px, 56%); }
        }
      `}</style>

      <header className="ebook-proof__heading">
        <p className="ebook-proof__eyebrow">Cover proof</p>
        <span className="ebook-proof__mark">Paperback</span>
      </header>

      <div className="ebook-proof__stage" aria-hidden="true">
        <div className="ebook-proof__book">
          <div className="ebook-proof__pages" />
          <div className="ebook-proof__cover">
            <div className="ebook-proof__spine">
              <span className="ebook-proof__spine-title">{title}</span>
            </div>
            <div className="ebook-proof__art-frame">
              <img className="ebook-proof__art" src={coverArtSrc} alt="" />
            </div>
            <div className="ebook-proof__type">
              <h2 className="ebook-proof__title">{title}</h2>
              {subtitle ? <p className="ebook-proof__subtitle">{subtitle}</p> : null}
            </div>
            {authorName ? <p className="ebook-proof__author">{authorName}</p> : null}
          </div>
        </div>
      </div>

      <figcaption className="ebook-proof__caption">Physical paperback · editable cover</figcaption>
    </figure>
  );
}
