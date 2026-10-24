import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  HandCoins,
  House,
  Landmark,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import heroImage from "@/assets/citygate-loans-hero.jpg";
import businessImage from "@/assets/citygate-business-owner.jpg";

const rupee = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const money = (value: number) => `₦${rupee.format(Math.max(0, Math.round(value)))}`;

const pageStyles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
.td-loans{--ink:#1d2f2b;--muted:#65736c;--paper:#f7f7f1;--white:#fffefa;--line:#dfe5dc;--green:#1b5947;--green-deep:#103d32;--lime:#d8ed8c;--orange:#ef8c3b;color:var(--ink);background:var(--paper);font-family:'DM Sans',sans-serif;min-height:100dvh;overflow:hidden}
.td-loans *{box-sizing:border-box}.td-loans h1,.td-loans h2,.td-loans h3{font-family:'Manrope',sans-serif;letter-spacing:-.045em}.td-loans a{color:inherit;text-decoration:none}.td-loans button,.td-loans input,.td-loans select{font:inherit}.td-wrap{width:min(1160px,calc(100% - 48px));margin:0 auto}
.td-nav{height:76px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:5}.td-brand{display:flex;align-items:center;gap:10px;font-family:'Manrope',sans-serif;font-weight:800;letter-spacing:-.05em;font-size:20px}.td-mark{width:34px;height:34px;background:var(--green);color:#f3f3e8;display:grid;place-items:center;border-radius:11px 11px 11px 3px;font-size:16px}.td-brand small{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#728077;font-weight:700;display:block;margin-top:-2px}.td-navlinks{display:flex;gap:32px;align-items:center;font-size:13px;font-weight:600;color:#46574f}.td-navlinks a:hover{color:var(--green)}.td-navright{display:flex;gap:11px;align-items:center}.td-quiet{border:0;background:transparent;padding:11px 14px;color:var(--ink);font-size:13px;font-weight:700;cursor:pointer}.td-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--green);color:white!important;border:0;border-radius:7px;padding:14px 19px;font-size:13px;font-weight:700;cursor:pointer;transition:transform .2s,background .2s}.td-btn:hover{background:var(--green-deep);transform:translateY(-2px)}.td-btn-light{background:var(--lime);color:var(--ink)!important}.td-btn-light:hover{background:#e4f2b4}.td-btn-outline{background:transparent;color:var(--ink)!important;border:1px solid #c7d0c6}.td-btn-outline:hover{background:#edf0e8}.td-mobile-menu{display:none}
.td-eyebrow{display:inline-flex;align-items:center;gap:9px;text-transform:uppercase;letter-spacing:.15em;font-size:10px;font-weight:800;color:var(--green)}.td-eyebrow:before{content:'';width:22px;height:1px;background:currentColor}.td-dir-hero{position:relative;padding:58px 0 86px}.td-dir-grid{display:grid;grid-template-columns:1fr .88fr;gap:70px;align-items:center}.td-dir-copy h1{font-size:clamp(48px,6vw,76px);line-height:1.03;margin:22px 0 22px;max-width:680px}.td-dir-copy h1 em{color:var(--green);font-style:normal}.td-lede{font-size:17px;line-height:1.72;color:#66756d;max-width:525px}.td-dir-actions{display:flex;align-items:center;gap:24px;margin-top:30px}.td-textlink{font-weight:700;font-size:13px;display:flex;align-items:center;gap:9px}.td-trustline{display:flex;align-items:center;gap:12px;margin-top:38px;font-size:11px;color:#69776f}.td-trustline svg{color:var(--green)}.td-hero-visual{position:relative;min-height:470px}.td-hero-photo{position:absolute;inset:0 18px 18px 0;border-radius:170px 170px 12px 12px;background:#dce5dc;overflow:hidden}.td-hero-photo img{width:100%;height:100%;object-fit:cover;object-position:61% center}.td-photo-tag{position:absolute;left:0;bottom:3px;background:var(--white);padding:17px 21px;border:1px solid var(--line);box-shadow:0 12px 34px #1b392616;border-radius:8px;display:flex;gap:12px;align-items:center}.td-photo-tag-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:var(--green);background:#edf3dc}.td-photo-tag strong{display:block;font-size:12px}.td-photo-tag span{font-size:10px;color:var(--muted)}.td-orbit{position:absolute;right:-8px;top:22px;writing-mode:vertical-rl;letter-spacing:.2em;text-transform:uppercase;font-size:9px;color:#738078}
.td-section{padding:90px 0}.td-section-head{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:36px}.td-section-head h2{font-size:clamp(34px,4.5vw,54px);line-height:1.08;margin:12px 0 0;max-width:620px}.td-section-head p{max-width:340px;color:var(--muted);font-size:13px;line-height:1.7;margin:0 0 4px}.td-lenders{background:#e9eee5}.td-lender-card{display:grid;grid-template-columns:1.1fr .9fr;background:var(--white);border:1px solid #d8e0d5;border-radius:11px;overflow:hidden;min-height:400px}.td-lender-content{padding:clamp(28px,5vw,58px);display:flex;flex-direction:column;align-items:flex-start}.td-citygate-mark{font-family:'Manrope',sans-serif;font-size:18px;font-weight:800;letter-spacing:-.04em;display:flex;align-items:center;gap:10px}.td-citygate-symbol{color:var(--orange);width:30px;height:30px;border:2px solid currentColor;display:grid;place-items:center;border-radius:9px 9px 9px 2px}.td-lender-content h3{font-size:34px;line-height:1.12;margin:34px 0 12px;max-width:480px}.td-lender-content p{font-size:14px;line-height:1.75;color:var(--muted);max-width:470px;margin:0}.td-lender-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;margin-top:auto;padding-top:35px}.td-lender-foot span{font-size:11px;color:#67776e;display:flex;align-items:center;gap:8px}.td-lender-image{position:relative;min-height:360px;overflow:hidden}.td-lender-image img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.td-lender-image:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,#15392e8c)}.td-lender-image-label{position:absolute;z-index:1;left:24px;bottom:23px;color:white;font-size:12px;font-weight:700;letter-spacing:.04em}.td-more-note{margin-top:20px;color:#617067;font-size:12px;display:flex;gap:10px;align-items:center}
.td-products{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.td-product{padding:25px 24px 29px;border-right:1px solid var(--line)}.td-product:last-child{border:0}.td-product-icon{width:40px;height:40px;border-radius:50%;background:#e7eddd;color:var(--green);display:grid;place-items:center;margin-bottom:22px}.td-product h3{font-size:17px;letter-spacing:-.03em;margin:0 0 9px}.td-product p{font-size:12px;line-height:1.7;color:var(--muted);margin:0}
.td-process{background:var(--green-deep);color:#f4f2e8;position:relative}.td-process .td-eyebrow{color:var(--lime)}.td-process .td-section-head p{color:#c4d1c6}.td-steps{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #ffffff36}.td-step{padding:25px 26px 7px 0;position:relative}.td-step:not(:last-child){border-right:1px solid #ffffff36}.td-step:not(:first-child){padding-left:26px}.td-step-num{font-family:'Manrope',sans-serif;font-size:12px;color:var(--lime);letter-spacing:.1em}.td-step h3{font-size:20px;margin:22px 0 10px;letter-spacing:-.035em}.td-step p{font-size:12px;line-height:1.75;color:#bdccc2;max-width:270px}
.td-honesty{display:grid;grid-template-columns:.8fr 1.2fr;gap:75px;align-items:start}.td-honesty h2{font-size:clamp(34px,4.5vw,54px);line-height:1.1;margin:16px 0}.td-honesty p{color:var(--muted);line-height:1.75;font-size:14px}.td-honesty-list{border-top:1px solid var(--line)}.td-honesty-item{display:grid;grid-template-columns:34px 1fr;gap:14px;padding:19px 0;border-bottom:1px solid var(--line)}.td-honesty-item svg{color:var(--green);margin-top:2px}.td-honesty-item strong{font-size:13px;display:block;margin-bottom:5px}.td-honesty-item span{font-size:12px;color:var(--muted);line-height:1.65}
.td-footer{background:#e8ede5;padding:28px 0}.td-footer-inner{display:flex;align-items:center;justify-content:space-between;gap:20px}.td-footer p{font-size:11px;color:#68766d;margin:0}.td-footer-links{display:flex;gap:20px;font-size:11px;color:#46574f}
.td-city-hero{background:#e8eee5;padding:34px 0 66px}.td-city-hero-grid{display:grid;grid-template-columns:.92fr 1.08fr;gap:64px;align-items:center}.td-city-copy{padding:38px 0}.td-city-copy h1{font-size:clamp(45px,5.6vw,72px);line-height:1.02;margin:20px 0 18px}.td-city-copy h1 span{color:var(--green)}.td-city-copy p{font-size:15px;line-height:1.75;color:#65736b;max-width:480px}.td-city-hero-photo{height:485px;position:relative;border-radius:13px 170px 13px 13px;overflow:hidden;background:#d7e2d5}.td-city-hero-photo img{height:100%;width:100%;object-fit:cover;object-position:60% center}.td-image-caption{position:absolute;bottom:16px;left:16px;background:#fffefaeb;padding:12px 15px;border-radius:5px;font-size:11px;font-weight:700;display:flex;gap:9px;align-items:center}.td-image-caption svg{color:var(--green)}.td-productstrip{display:flex;gap:10px;flex-wrap:wrap;margin-top:25px}.td-chip{display:inline-flex;gap:7px;align-items:center;padding:9px 11px;border:1px solid #cad6ca;border-radius:99px;font-size:10px;font-weight:700;color:#43564b;background:#f5f6ef}
.td-estimator-section{background:var(--green-deep);color:#f7f5ed;padding:92px 0}.td-estimator-grid{display:grid;grid-template-columns:.72fr 1.28fr;gap:70px;align-items:start}.td-estimator-intro{position:sticky;top:25px}.td-estimator-intro .td-eyebrow{color:var(--lime)}.td-estimator-intro h2{font-size:clamp(38px,4.8vw,58px);line-height:1.04;margin:17px 0}.td-estimator-intro p{color:#c6d3c9;font-size:13px;line-height:1.75}.td-estimate-warning{border-left:2px solid var(--lime);padding:12px 0 12px 15px;margin-top:25px;color:#d3dfd5;font-size:11px;line-height:1.65}.td-estimator-card{background:#fffefa;color:var(--ink);border-radius:10px;overflow:hidden}.td-estimator-top{padding:25px 29px 19px;border-bottom:1px solid #e2e7de}.td-step-meta{font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:#718078;font-weight:800;display:flex;justify-content:space-between}.td-progress{height:3px;background:#e7ebe2;margin-top:14px;overflow:hidden}.td-progress span{height:100%;display:block;background:#8aa860;transition:width .3s}.td-form-body{padding:26px 29px 30px}.td-form-body h3{font-size:23px;margin:0 0 6px}.td-form-hint{font-size:12px;color:#718078;margin:0 0 21px}.td-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.td-field{display:flex;flex-direction:column;gap:7px}.td-field-full{grid-column:1/-1}.td-field label{font-size:11px;font-weight:700;color:#40534a}.td-field input,.td-field select{width:100%;height:45px;border:1px solid #d6dfd4;border-radius:5px;background:#fffefa;padding:0 12px;color:#263930;outline:none;font-size:12px}.td-field input:focus,.td-field select:focus{border-color:#31745b;box-shadow:0 0 0 3px #31745b21}.td-field input::placeholder{color:#a2aaa1}.td-input-prefix{position:relative}.td-input-prefix span{position:absolute;top:50%;left:12px;transform:translateY(-50%);font-size:12px;color:#65756b}.td-input-prefix input{padding-left:31px}.td-form-actions{display:flex;justify-content:space-between;align-items:center;margin-top:24px;gap:12px}.td-form-actions .td-btn{min-width:146px}.td-privacy{font-size:10px;color:#738078;display:flex;gap:6px;align-items:center}
.td-tenure-control{display:flex;align-items:center;gap:13px}.td-tenure-control input{accent-color:#28634f;padding:0;flex:1}.td-tenure-value{min-width:70px;font-weight:800;font-size:13px;color:#275740}.td-estimate-box{background:#edf2e8;border:1px solid #d8e3d4;border-radius:6px;padding:17px 18px;margin:18px 0}.td-estimate-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:#617168}.td-estimate-number{font-family:'Manrope',sans-serif;font-weight:800;font-size:32px;letter-spacing:-.06em;margin:5px 0}.td-estimate-box p{font-size:10px;line-height:1.6;color:#67766d;margin:0}.td-consent{display:flex;align-items:flex-start;gap:10px;font-size:11px;color:#5e6c63;line-height:1.55}.td-consent input{margin:2px 0 0;accent-color:#28634f}.td-success-state{text-align:center;padding:48px 30px}.td-success-icon{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#e5efdd;color:#2d674e;margin:0 auto 18px}.td-success-state h3{font-size:27px;margin:0 0 10px}.td-success-state p{font-size:13px;color:#68766e;line-height:1.7;max-width:410px;margin:0 auto 18px}.td-reference{padding:72px 0;background:#f7f7f1}.td-reference-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.td-reference-card{background:#e9eee5;border-radius:9px;padding:27px;display:flex;gap:17px;align-items:flex-start}.td-reference-card svg{color:var(--green);flex:0 0 auto}.td-reference-card h3{font-size:16px;margin:0 0 7px}.td-reference-card p{font-size:11px;line-height:1.65;color:#66746b;margin:0}
.td-faq{padding:78px 0}.td-faq-grid{display:grid;grid-template-columns:.75fr 1.25fr;gap:70px}.td-faq h2{font-size:42px;line-height:1.1;margin:14px 0}.td-faq-list{border-top:1px solid var(--line)}.td-faq details{border-bottom:1px solid var(--line);padding:19px 0}.td-faq summary{list-style:none;display:flex;justify-content:space-between;gap:15px;cursor:pointer;font-size:13px;font-weight:700}.td-faq summary::-webkit-details-marker{display:none}.td-faq details p{font-size:12px;color:var(--muted);line-height:1.7;max-width:600px;margin:13px 0 0}.td-city-footer{background:var(--green-deep);color:#f3f3e9;padding:30px 0}.td-city-footer .td-footer-inner p,.td-city-footer .td-footer-links{color:#c3d0c5}.td-error{background:#fff0eb;border:1px solid #f0c8b7;padding:12px 14px;color:#943c20;font-size:11px;border-radius:5px;margin-top:15px}
.td-loans a:focus-visible,.td-loans button:focus-visible,.td-loans summary:focus-visible{outline:3px solid #e9a761;outline-offset:3px}.td-reveal{animation:td-rise .65s both}.td-reveal-delay{animation-delay:.12s}@keyframes td-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:850px){.td-navlinks{display:none}.td-mobile-menu{display:grid;place-items:center;border:1px solid var(--line);background:transparent;width:40px;height:40px;border-radius:6px;color:var(--ink)}.td-navright>.td-quiet{display:none}.td-dir-grid,.td-city-hero-grid{grid-template-columns:1fr;gap:34px}.td-dir-hero{padding:36px 0 64px}.td-hero-visual{min-height:390px;max-width:560px;width:100%;margin:0 auto}.td-section{padding:68px 0}.td-products{grid-template-columns:1fr 1fr}.td-product:nth-child(2){border-right:0}.td-product:nth-child(-n+2){border-bottom:1px solid var(--line)}.td-honesty,.td-estimator-grid,.td-faq-grid{grid-template-columns:1fr;gap:30px}.td-estimator-intro{position:static}.td-city-hero-grid{gap:20px}.td-city-copy{padding:20px 0 0}.td-city-hero-photo{height:390px}.td-estimator-section{padding:68px 0}.td-lender-card{grid-template-columns:1fr 1fr}.td-lender-content{padding:30px}.td-lender-foot{align-items:flex-start;flex-direction:column}.td-lender-content h3{font-size:29px;margin-top:24px}}
@media(max-width:580px){.td-wrap{width:min(100% - 32px,1160px)}.td-nav{height:66px}.td-brand{font-size:18px}.td-navright .td-btn{padding:11px 12px;font-size:11px}.td-dir-copy h1{font-size:48px}.td-lede{font-size:15px}.td-dir-actions{align-items:flex-start;flex-direction:column;gap:16px}.td-hero-visual{min-height:335px}.td-hero-photo{right:10px;border-radius:120px 120px 8px 8px}.td-photo-tag{padding:12px}.td-orbit{right:-3px}.td-section-head{align-items:flex-start;flex-direction:column;margin-bottom:26px}.td-section-head h2{font-size:37px}.td-lender-card{grid-template-columns:1fr}.td-lender-image{min-height:250px;order:-1}.td-lender-content{padding:25px}.td-lender-content h3{font-size:27px}.td-lender-foot{padding-top:24px}.td-products{grid-template-columns:1fr 1fr}.td-product{padding:19px 14px}.td-product h3{font-size:15px}.td-product p{font-size:11px}.td-steps{grid-template-columns:1fr}.td-step,.td-step:not(:first-child){padding:18px 0;border-right:0;border-bottom:1px solid #ffffff36}.td-step:last-child{border-bottom:0}.td-step h3{margin:12px 0 6px}.td-honesty{gap:14px}.td-footer-inner{align-items:flex-start;flex-direction:column}.td-footer-links{flex-wrap:wrap}.td-city-copy h1{font-size:48px}.td-city-hero-photo{height:330px;border-radius:12px 115px 12px 12px}.td-chip{font-size:9px;padding:8px}.td-estimator-card{margin:0 -1px}.td-estimator-top{padding:20px}.td-form-body{padding:22px 20px}.td-field-grid{grid-template-columns:1fr;gap:13px}.td-field-full{grid-column:auto}.td-form-actions{align-items:stretch;flex-direction:column-reverse}.td-form-actions .td-btn{width:100%}.td-privacy{justify-content:center}.td-reference-grid{grid-template-columns:1fr}.td-faq h2{font-size:36px}}
@media(prefers-reduced-motion:reduce){.td-reveal{animation:none}.td-loans *{scroll-behavior:auto!important;transition-duration:.01ms!important}}
`;

function Logo({ citygate = false }: { citygate?: boolean }) {
  return citygate ? (
    <span className="td-citygate-mark"><span className="td-citygate-symbol"><Building2 size={17} /></span> CITYGATE GLOBAL</span>
  ) : (
    <span className="td-brand"><span className="td-mark">t</span><span>taskdrip<small>loans directory</small></span></span>
  );
}

function PublicNav({ citygate = false }: { citygate?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="td-wrap">
      <nav className="td-nav" aria-label="Main navigation">
        <Link href="/loans"><Logo /></Link>
        <div className="td-navlinks">
          <a href={citygate ? "#loan-options" : "#lenders"}>Loan options</a>
          <a href={citygate ? "#estimate" : "#how-it-works"}>{citygate ? "Estimate" : "How it works"}</a>
          <a href={citygate ? "#questions" : "#about-directory"}>About</a>
        </div>
        <div className="td-navright">
          <Link href="/loans" className="td-quiet">Directory</Link>
          <a className="td-btn" href={citygate ? "#estimate" : "/citygate-global-loans"}>{citygate ? "Start an estimate" : "Explore Citygate"} <ArrowRight size={15} /></a>
          <button className="td-mobile-menu" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </nav>
      {open && <div className="td-mobile-links"><a href={citygate ? "#loan-options" : "#lenders"} onClick={() => setOpen(false)}>Loan options</a><a href={citygate ? "#estimate" : "#how-it-works"} onClick={() => setOpen(false)}>{citygate ? "Estimate" : "How it works"}</a><a href="/loans">Directory</a></div>}
    </div>
  );
}

const products = [
  { icon: Wallet, title: "Payday", label: "Private sector", copy: "For eligible salary earners in private companies." },
  { icon: Landmark, title: "Payroll", label: "Public sector", copy: "For eligible workers in public-sector organisations." },
  { icon: BriefcaseBusiness, title: "SME working capital", label: "For businesses", copy: "Explore working capital options for a business need." },
  { icon: House, title: "Asset financing", label: "For planned purchases", copy: "Financing options for assets and home improvements." },
];

export default function LoansDirectory() {
  return (
    <main className="td-loans">
      <style>{pageStyles}</style>
      <PublicNav />
      <section className="td-dir-hero">
        <div className="td-wrap td-dir-grid">
          <div className="td-dir-copy td-reveal">
            <span className="td-eyebrow">A clearer place to start</span>
            <h1>Find a loan that fits <em>your next step.</em></h1>
            <p className="td-lede">Taskdrip brings loan options together in one directory. Start with Citygate Global, our first listed lender, and compare what may suit your plans.</p>
            <div className="td-dir-actions">
              <Link href="/citygate-global-loans" className="td-btn">Explore Citygate options <ArrowRight size={16} /></Link>
              <a className="td-textlink" href="#how-it-works">How this directory works <ArrowDownRight size={16} /></a>
            </div>
            <div className="td-trustline"><ShieldCheck size={17} /><span>Clear information. No promises of approval.</span></div>
          </div>
          <div className="td-hero-visual td-reveal td-reveal-delay">
            <div className="td-hero-photo"><img src={heroImage} alt="A Nigerian couple looking at their home improvement plans" /></div>
            <span className="td-orbit">Loans, made easier to explore</span>
            <div className="td-photo-tag"><span className="td-photo-tag-icon"><FileCheck2 size={18} /></span><span><strong>Start with the details</strong><span>Know what to ask before you apply</span></span></div>
          </div>
        </div>
      </section>
      <section id="lenders" className="td-section td-lenders">
        <div className="td-wrap">
          <div className="td-section-head"><div><span className="td-eyebrow">Lender directory · 01</span><h2>A first option worth a closer look.</h2></div><p>Explore the lender’s product categories and use a non-binding estimate before deciding whether to take the next step.</p></div>
          <article className="td-lender-card">
            <div className="td-lender-content">
              <Logo citygate />
              <h3>Loan options for work, business and the things you’re building.</h3>
              <p>Citygate Global Investment Limited is the first lender featured in the Taskdrip loans directory. Its listed options include salary-based lending, SME working capital and asset financing.</p>
              <div className="td-lender-foot"><span><BadgeCheck size={16} /> Lender product information</span><Link href="/citygate-global-loans" className="td-btn">View lender details <ArrowUpRight size={15} /></Link></div>
            </div>
            <div className="td-lender-image"><img src={businessImage} alt="A small business owner reviewing products in her shop" /><span className="td-lender-image-label">For individuals and growing businesses</span></div>
          </article>
          <div className="td-more-note"><CircleHelp size={15} /> Taskdrip is a directory, not a lender. Product terms are set by each lender.</div>
        </div>
      </section>
      <section id="about-directory" className="td-section">
        <div className="td-wrap">
          <div className="td-section-head"><div><span className="td-eyebrow">Start with what you need</span><h2>Different plans. Different kinds of lending.</h2></div><p>Product descriptions are a starting point, not an eligibility decision. Confirm requirements and terms directly with the lender.</p></div>
          <div className="td-products">{products.map(({ icon: Icon, title, label, copy }) => <article key={title} className="td-product"><span className="td-product-icon"><Icon size={19} /></span><span className="td-eyebrow">{label}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </div>
      </section>
      <section id="how-it-works" className="td-section td-process">
        <div className="td-wrap">
          <div className="td-section-head"><div><span className="td-eyebrow">A thoughtful first step</span><h2>Explore first. Decide with the facts.</h2></div><p>Keep control of your choice at every step. An estimate is an illustration, never an approval.</p></div>
          <div className="td-steps">
            <article className="td-step"><span className="td-step-num">01 / EXPLORE</span><h3>Find an option</h3><p>Browse lender products and choose the category that best matches your situation.</p></article>
            <article className="td-step"><span className="td-step-num">02 / ESTIMATE</span><h3>See a simple illustration</h3><p>Use your cash-flow details to create a non-binding estimate, with the assumptions shown.</p></article>
            <article className="td-step"><span className="td-step-num">03 / CONFIRM</span><h3>Review directly</h3><p>Ask the lender about eligibility, requirements, fees, rates and repayment terms before applying.</p></article>
          </div>
        </div>
      </section>
      <section className="td-section">
        <div className="td-wrap td-honesty">
          <div><span className="td-eyebrow">Plain language, always</span><h2>Good decisions need honest limits.</h2><p>We want this directory to make it easier to ask informed questions—not to make financial decisions for you.</p></div>
          <div className="td-honesty-list">
            <div className="td-honesty-item"><ShieldCheck size={19} /><div><strong>No guaranteed access or approval</strong><span>Only the lender can assess eligibility and decide whether to offer a loan.</span></div></div>
            <div className="td-honesty-item"><FileCheck2 size={19} /><div><strong>Terms can vary</strong><span>Confirm current rates, fees, requirements and repayment details with the lender directly.</span></div></div>
            <div className="td-honesty-item"><LockKeyhole size={19} /><div><strong>Share information thoughtfully</strong><span>Review any application details and consent choices before sending them.</span></div></div>
          </div>
        </div>
      </section>
      <footer className="td-footer"><div className="td-wrap td-footer-inner"><Link href="/loans"><Logo /></Link><p>Taskdrip loans directory · Information to help you explore, not financial advice.</p><div className="td-footer-links"><a href="#about-directory">Product options</a><Link href="/citygate-global-loans">Citygate Global</Link></div></div></footer>
    </main>
  );
}

type LoanType = "payday" | "payroll" | "sme" | "asset" | "monee";
type ApplicationData = {
  fullName: string; email: string; phone: string; dateOfBirth: string; state: string;
  loanType: LoanType; employmentStatus: string; businessType: string; productSold: string;
  sixMonthTurnover: string; monthlyNetIncome: string; assetAmount: string; requestedAmount: string;
  tenureMonths: number; consent: boolean; marketingConsent: boolean;
};

const initialApplication: ApplicationData = {
  fullName: "", email: "", phone: "", dateOfBirth: "", state: "", loanType: "payday",
  employmentStatus: "", businessType: "", productSold: "", sixMonthTurnover: "",
  monthlyNetIncome: "", assetAmount: "", requestedAmount: "", tenureMonths: 3,
  consent: false, marketingConsent: false,
};

const loanNames: Record<LoanType, string> = {
  payday: "Payday loan", payroll: "Payroll loan", sme: "SME working capital",
  asset: "Asset financing", monee: "Monee",
};

function Field({ label, name, value, onChange, type = "text", placeholder, required = false, min, max, children }: {
  label: string; name: string; value?: string; onChange?: (value: string) => void; type?: string; placeholder?: string;
  required?: boolean; min?: string; max?: string; children?: ReactNode;
}) {
  return <div className="td-field"><label htmlFor={name}>{label}{required && " *"}</label>{children || <input id={name} name={name} type={type} value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} required={required} min={min} max={max} />}</div>;
}

export function CitygateLoansPage() {
  const [data, setData] = useState<ApplicationData>(initialApplication);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; estimateNaira: number; estimateBasis: string; emailSent: boolean } | null>(null);
  const cashFlow = useMemo(() => {
    const income = Number(data.monthlyNetIncome) || 0;
    return income > 0 ? income : (Number(data.sixMonthTurnover) || 0) / 6;
  }, [data.monthlyNetIncome, data.sixMonthTurnover]);
  const capacity = cashFlow * .3 * data.tenureMonths;
  const estimate = Math.min(data.requestedAmount ? Number(data.requestedAmount) || 0 : capacity, capacity);
  const update = (key: keyof ApplicationData, value: string | number | boolean) => setData((previous) => ({ ...previous, [key]: value }));
  const scrollToEstimate = () => document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth" });
  const next = () => {
    setError("");
    if (step === 1 && !data.loanType) setError("Choose a loan option to continue.");
    else setStep(2);
  };
  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!data.consent) { setError("Please confirm consent to submit your application details."); return; }
    setSubmitting(true);
    const payload = {
      ...data,
      sixMonthTurnover: data.sixMonthTurnover ? Number(data.sixMonthTurnover) : 0,
      monthlyNetIncome: data.monthlyNetIncome ? Number(data.monthlyNetIncome) : 0,
      assetAmount: data.assetAmount ? Number(data.assetAmount) : 0,
      requestedAmount: data.requestedAmount ? Number(data.requestedAmount) : 0,
    };
    try {
      const response = await apiRequest("POST", "/api/citygate-loans/applications", payload);
      const json = await response.json();
      setResult(json);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We could not send your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="td-loans">
      <style>{pageStyles}</style>
      <PublicNav citygate />
      <section className="td-city-hero">
        <div className="td-wrap td-city-hero-grid">
          <div className="td-city-copy td-reveal">
            <span className="td-eyebrow">Taskdrip lender directory · Citygate Global</span>
            <h1>Make room for the things <span>you’re building.</span></h1>
            <p>Explore Citygate Global loan options for salary earners, SMEs and people planning an asset purchase or home improvement. Start with the details that matter to you.</p>
            <div className="td-dir-actions"><button className="td-btn" onClick={scrollToEstimate}>Build a cash-flow estimate <ArrowRight size={16} /></button><Link href="/loans" className="td-textlink"><ArrowLeft size={15} /> Back to all loan options</Link></div>
            <div className="td-productstrip"><span className="td-chip"><Wallet size={13} /> Payday</span><span className="td-chip"><Landmark size={13} /> Payroll</span><span className="td-chip"><BriefcaseBusiness size={13} /> SME working capital</span><span className="td-chip"><House size={13} /> Asset financing</span></div>
          </div>
          <div className="td-city-hero-photo td-reveal td-reveal-delay"><img src={heroImage} alt="A couple standing in front of their home" /><span className="td-image-caption"><Building2 size={16} /> Citygate Global · Loan options</span></div>
        </div>
      </section>
      <section id="loan-options" className="td-section">
        <div className="td-wrap">
          <div className="td-section-head"><div><span className="td-eyebrow">Options to explore</span><h2>Start with the need in front of you.</h2></div><p>These are product categories supplied for Citygate Global. Ask the lender for current eligibility, requirements and official terms.</p></div>
          <div className="td-products">{products.map(({ icon: Icon, title, label, copy }) => <article key={title} className="td-product"><span className="td-product-icon"><Icon size={19} /></span><span className="td-eyebrow">{label}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </div>
      </section>
      <section id="estimate" className="td-estimator-section">
        <div className="td-wrap td-estimator-grid">
          <div className="td-estimator-intro"><span className="td-eyebrow">A clear first look</span><h2>Estimate with your cash flow in mind.</h2><p>Share a few details to create a simple illustration. It is not a loan decision, does not set official Citygate terms, and does not guarantee access or approval.</p><div className="td-estimate-warning">Calculation: the lower of your requested amount (if entered) and 30% of monthly cash flow × chosen term. Cash flow uses monthly net income; if that is zero, it uses six-month turnover ÷ 6. Term: 1–6 months. Interest and fees are excluded.</div></div>
          <section className="td-estimator-card" aria-label="Citygate Global loan application and estimate">
            {result ? (
              <div className="td-success-state"><span className="td-success-icon"><Check size={27} /></span><h3>Details received</h3><p>Your reference is <strong>{result.id}</strong>. The estimate returned is <strong>{money(result.estimateNaira)}</strong>. This is a cash-flow illustration, not lender approval or official terms.</p><p>{result.emailSent ? "An email confirmation was sent to the address provided." : "Your details were submitted. Email confirmation was not reported."}</p><button className="td-btn td-btn-outline" onClick={() => { setResult(null); setData(initialApplication); setStep(1); }}>Start another estimate</button></div>
            ) : (
              <>
                <div className="td-estimator-top"><div className="td-step-meta"><span>Application & estimate</span><span>Step {step} of 2</span></div><div className="td-progress"><span style={{ width: step === 1 ? "50%" : "100%" }} /></div></div>
                <form onSubmit={submitApplication} noValidate>
                  {step === 1 ? <div className="td-form-body">
                    <h3>What are you planning?</h3><p className="td-form-hint">Choose a product and share a little about income or business cash flow.</p>
                    <div className="td-field-grid">
                      <Field label="Loan option" name="loanType" required><select id="loanType" value={data.loanType} onChange={(e) => update("loanType", e.target.value as LoanType)}>{Object.entries(loanNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
                      <Field label="Employment status" name="employmentStatus"><select id="employmentStatus" value={data.employmentStatus} onChange={(e) => update("employmentStatus", e.target.value)}><option value="">Select if applicable</option><option value="employed-private">Employed — private sector</option><option value="employed-public">Employed — public sector</option><option value="self-employed">Self-employed</option><option value="business-owner">Business owner</option><option value="other">Other</option></select></Field>
                      {(data.loanType === "sme" || data.loanType === "monee") && <>
                        <Field label="Business type" name="businessType" value={data.businessType} onChange={(v) => update("businessType", v)} placeholder="e.g. Retail, services" />
                        <Field label="Product or service sold" name="productSold" value={data.productSold} onChange={(v) => update("productSold", v)} placeholder="What does your business sell?" />
                        <Field label="Business turnover in the last 6 months (₦)" name="sixMonthTurnover" value={data.sixMonthTurnover} onChange={(v) => update("sixMonthTurnover", v)} type="number" min="0" placeholder="0" />
                      </>}
                      <Field label="Monthly net income (₦)" name="monthlyNetIncome" value={data.monthlyNetIncome} onChange={(v) => update("monthlyNetIncome", v)} type="number" min="0" placeholder="Enter 0 to use turnover, if applicable" />
                      {data.loanType === "asset" && <Field label="Asset amount (₦)" name="assetAmount" value={data.assetAmount} onChange={(v) => update("assetAmount", v)} type="number" min="0" placeholder="Optional" />}
                      <Field label="Requested amount (₦)" name="requestedAmount" value={data.requestedAmount} onChange={(v) => update("requestedAmount", v)} type="number" min="0" placeholder="Optional — uses estimate limit if blank" />
                      <div className="td-field td-field-full"><label htmlFor="tenureMonths">Illustration term</label><div className="td-tenure-control"><input id="tenureMonths" type="range" min="1" max="6" step="1" value={data.tenureMonths} onChange={(e) => update("tenureMonths", Number(e.target.value))} aria-label={`Term: ${data.tenureMonths} months`} /><span className="td-tenure-value">{data.tenureMonths} months</span></div></div>
                    </div>
                    <div className="td-estimate-box"><span className="td-estimate-label">Illustrative amount</span><div className="td-estimate-number">{money(estimate)}</div><p>{cashFlow > 0 ? `${money(cashFlow)} monthly cash flow × 30% × ${data.tenureMonths} months${data.requestedAmount ? `, capped at requested ${money(Number(data.requestedAmount))}` : ""}.` : "Enter monthly net income or eligible business turnover to see an illustration."} Excludes interest and fees.</p></div>
                    <div className="td-form-actions"><span className="td-privacy"><LockKeyhole size={13} /> Your information is sent securely.</span><button type="button" className="td-btn" onClick={next}>Continue <ArrowRight size={15} /></button></div>
                  </div> : <div className="td-form-body">
                    <h3>Your contact details</h3><p className="td-form-hint">The details below accompany your enquiry to Citygate Global.</p>
                    <div className="td-field-grid">
                      <Field label="Full name" name="fullName" value={data.fullName} onChange={(v) => update("fullName", v)} required placeholder="As shown on your ID" />
                      <Field label="Email address" name="email" value={data.email} onChange={(v) => update("email", v)} required type="email" placeholder="you@example.com" />
                      <Field label="Phone number" name="phone" value={data.phone} onChange={(v) => update("phone", v)} required type="tel" placeholder="+234" />
                      <Field label="Date of birth" name="dateOfBirth" value={data.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} required type="date" max={new Date().toISOString().slice(0, 10)} />
                      <Field label="State of residence" name="state" value={data.state} onChange={(v) => update("state", v)} required placeholder="e.g. Lagos" />
                      <div className="td-field td-field-full"><div className="td-estimate-box"><span className="td-estimate-label">Your non-binding illustration</span><div className="td-estimate-number">{money(estimate)}</div><p>{loanNames[data.loanType]} · {data.tenureMonths} month term. This is not approval or an official offer.</p></div></div>
                      <label className="td-consent td-field-full"><input type="checkbox" checked={data.consent} onChange={(e) => update("consent", e.target.checked)} /><span>I consent to Taskdrip sharing the information above with Citygate Global for this loan enquiry. I understand that Citygate Global determines eligibility and terms. *</span></label>
                      <label className="td-consent td-field-full"><input type="checkbox" checked={data.marketingConsent} onChange={(e) => update("marketingConsent", e.target.checked)} /><span>I would like to receive optional product updates. This choice is not required to submit an enquiry.</span></label>
                    </div>
                    <div className="td-form-actions"><button type="button" className="td-btn td-btn-outline" onClick={() => { setError(""); setStep(1); }}><ArrowLeft size={15} /> Back</button><button type="submit" className="td-btn" disabled={submitting}>{submitting ? "Sending details…" : "Submit enquiry"} {!submitting && <ArrowRight size={15} />}</button></div>
                    {error && <p className="td-error" role="alert">{error}</p>}
                  </div>}
                  {step === 1 && error && <div className="td-form-body" style={{ paddingTop: 0 }}><p className="td-error" role="alert">{error}</p></div>}
                </form>
              </>
            )}
          </section>
        </div>
      </section>
      <section className="td-reference">
        <div className="td-wrap td-reference-grid">
          <article className="td-reference-card"><ShieldCheck size={21} /><div><h3>Estimate, not an offer</h3><p>The calculation is a non-binding cash-flow illustration. It is not lender approval, a credit decision or official Citygate terms.</p></div></article>
          <article className="td-reference-card"><FileCheck2 size={21} /><div><h3>Confirm the full picture</h3><p>Ask Citygate Global directly about eligibility, rates, fees, documentation and repayment before making a decision.</p></div></article>
        </div>
      </section>
      <section id="questions" className="td-faq">
        <div className="td-wrap td-faq-grid">
          <div><span className="td-eyebrow">Before you continue</span><h2>Questions, answered plainly.</h2><p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: 13 }}>Understanding the limits of an estimate is part of making an informed choice.</p></div>
          <div className="td-faq-list">
            <details><summary>Does this estimate mean my loan is approved?<ChevronDown size={17} /></summary><p>No. It is a cash-flow illustration only. Citygate Global independently reviews applications and determines eligibility, approval, terms and any offer.</p></details>
            <details><summary>How is the estimate worked out?<ChevronDown size={17} /></summary><p>It is the lower of the requested amount, if you enter one, and 30% of monthly cash flow multiplied by your selected term in months. Monthly net income is used; if it is zero, six-month business turnover divided by six is used. The term is 1–6 months. Interest and fees are excluded.</p></details>
            <details><summary>Where can I confirm rates, fees and requirements?<ChevronDown size={17} /></summary><p>Contact Citygate Global directly for current official product terms, eligibility requirements and any associated rates or fees. None are represented by this illustration.</p></details>
            <details><summary>What happens when I submit my enquiry?<ChevronDown size={17} /></summary><p>Your application details are submitted to the Citygate Global loans application endpoint. Submission does not guarantee an email, follow-up, approval or access to a loan.</p></details>
          </div>
        </div>
      </section>
      <footer className="td-city-footer"><div className="td-wrap td-footer-inner"><Link href="/loans"><Logo /></Link><p>Taskdrip is a directory, not a lender. Estimate excludes interest and fees.</p><div className="td-footer-links"><Link href="/loans">Back to directory</Link><a href="#estimate">Build an estimate</a></div></div></footer>
    </main>
  );
}
