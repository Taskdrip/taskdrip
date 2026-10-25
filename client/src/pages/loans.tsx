import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  MessageCircle,
  Pause,
  Play,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import directoryImage from "../../../attached_assets/generated_images/taskdrip-loans-directory-hero.jpg";
import homePlanningImage from "../../../attached_assets/generated_images/citygate-home-planning-hero.jpg";

const pageStyles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Manrope:wght@500;600;700;800&display=swap');
.td-loans{--ink:#1f302b;--muted:#68766f;--paper:#f5f3e9;--white:#fffdf6;--line:#d9ded2;--green:#245947;--deep:#163c32;--lime:#d8e9a3;--copper:#bd6845;--soft:#e8ece1;min-height:100dvh;color:var(--ink);background:var(--paper);font-family:'DM Sans',sans-serif;overflow:hidden;position:relative}
.td-loans *{box-sizing:border-box}.td-loans h1,.td-loans h2,.td-loans h3{font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:-.035em}.td-loans a{color:inherit;text-decoration:none}.td-loans button,.td-loans input,.td-loans select{font:inherit}.td-loans button{color:inherit}.td-loans img{display:block}.td-wrap{width:min(1190px,calc(100% - 56px));margin-inline:auto}
.td-loans:before{content:"";pointer-events:none;position:fixed;inset:0;z-index:8;opacity:.12;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E")}
.td-nav{height:82px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:10;border-bottom:1px solid #d6dbd0}.td-brand{display:flex;align-items:center;gap:11px;font-family:'Manrope',sans-serif;font-weight:800;letter-spacing:-.06em;font-size:20px}.td-mark{width:35px;height:35px;background:var(--green);color:#f8f5e9;display:grid;place-items:center;border-radius:12px 12px 12px 3px;font-size:17px}.td-brand small{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#718078;font-weight:700;display:block;margin-top:-2px}.td-navlinks{display:flex;gap:31px;align-items:center;font-size:12px;font-weight:700;color:#53625a}.td-navlinks a{transition:color .2s}.td-navlinks a:hover{color:var(--copper)}.td-navright{display:flex;gap:12px;align-items:center}.td-quiet{border:0;background:transparent;padding:11px 14px;color:var(--ink);font-size:12px;font-weight:700;cursor:pointer}.td-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--green);color:#fffdf6!important;border:1px solid var(--green);border-radius:4px;padding:14px 19px;font-size:12px;font-weight:700;cursor:pointer;transition:transform .25s,background .25s,border-color .25s}.td-btn:hover{background:var(--deep);border-color:var(--deep);transform:translateY(-2px)}.td-btn-light{background:var(--lime);border-color:var(--lime);color:var(--ink)!important}.td-btn-light:hover{background:#e6efc8;border-color:#e6efc8}.td-btn-outline{background:transparent;color:var(--ink)!important;border-color:#c5cec1}.td-btn-outline:hover{background:#e8ece1;border-color:#aebdaf}.td-mobile-menu{display:none}.td-mobile-links{display:none}
.td-eyebrow{display:inline-flex;align-items:center;gap:10px;text-transform:uppercase;letter-spacing:.16em;font-size:9px;font-weight:800;color:var(--green)}.td-eyebrow:before{content:'';width:21px;height:1px;background:currentColor}.td-dir-hero{position:relative;padding:68px 0 98px}.td-dir-hero:after{content:"01";font:italic 16px 'Instrument Serif',serif;color:#b9c2b4;position:absolute;left:max(22px,calc((100vw - 1190px)/2));bottom:34px;letter-spacing:.1em}.td-dir-grid{display:grid;grid-template-columns:1.03fr .97fr;gap:80px;align-items:center}.td-dir-copy{padding:26px 0}.td-dir-copy h1{font-size:clamp(62px,7.3vw,98px);line-height:.94;margin:25px 0 25px;max-width:700px}.td-dir-copy h1 em{color:var(--green);font-style:italic}.td-lede{font-size:15px;line-height:1.85;color:#69776e;max-width:495px}.td-dir-actions{display:flex;align-items:center;gap:24px;margin-top:29px}.td-textlink{font-weight:700;font-size:12px;display:flex;align-items:center;gap:9px;transition:gap .2s}.td-textlink:hover{gap:14px}.td-trustline{display:flex;align-items:center;gap:11px;margin-top:34px;font-size:10px;color:#68766f;letter-spacing:.01em}.td-trustline svg{color:var(--green)}.td-hero-visual{position:relative;min-height:510px}.td-hero-photo{position:absolute;inset:0 18px 20px 0;border-radius:210px 210px 4px 4px;background:#dce5dc;overflow:hidden}.td-hero-photo img{width:100%;height:100%;object-fit:cover;object-position:61% center}.td-photo-tag{position:absolute;left:-24px;bottom:0;background:var(--white);padding:16px 19px;border:1px solid var(--line);box-shadow:0 14px 35px #1b392614;display:flex;gap:12px;align-items:center}.td-photo-tag-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:var(--green);background:#e9eedc}.td-photo-tag strong{display:block;font-size:11px}.td-photo-tag span{font-size:10px;color:var(--muted)}.td-orbit{position:absolute;right:-10px;top:26px;writing-mode:vertical-rl;letter-spacing:.2em;text-transform:uppercase;font-size:8px;color:#738078}
.td-section{padding:94px 0}.td-section-head{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:38px}.td-section-head h2{font-size:clamp(42px,5vw,64px);line-height:.98;margin:15px 0 0;max-width:650px}.td-section-head p{max-width:335px;color:var(--muted);font-size:12px;line-height:1.85;margin:0 0 4px}.td-lenders{background:#e8ece2;position:relative}.td-lenders:before{content:"";position:absolute;top:0;left:0;right:0;border-top:1px solid #d9ded2}.td-lender-card{display:grid;grid-template-columns:1.1fr .9fr;background:var(--white);border:1px solid #d9ded2;overflow:hidden;min-height:425px}.td-lender-content{padding:clamp(30px,5vw,62px);display:flex;flex-direction:column;align-items:flex-start}.td-citygate-mark{font-family:'Manrope',sans-serif;font-size:15px;font-weight:800;letter-spacing:-.03em;display:flex;align-items:center;gap:10px}.td-citygate-symbol{color:var(--copper);width:30px;height:30px;border:1px solid currentColor;display:grid;place-items:center;border-radius:10px 10px 10px 2px}.td-lender-content h3{font-size:clamp(35px,4vw,48px);line-height:1.02;margin:34px 0 15px;max-width:490px}.td-lender-content p{font-size:12px;line-height:1.85;color:var(--muted);max-width:470px;margin:0}.td-lender-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;margin-top:auto;padding-top:36px}.td-lender-foot span{font-size:10px;color:#68766e;display:flex;align-items:center;gap:8px}.td-lender-image{position:relative;min-height:360px;overflow:hidden}.td-lender-image img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.td-lender-image:after{content:'';position:absolute;inset:40% 0 0;background:linear-gradient(transparent,#163c327e)}.td-lender-image-label{position:absolute;z-index:1;left:25px;bottom:24px;color:#fff;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}.td-more-note{margin-top:20px;color:#617067;font-size:10px;display:flex;gap:10px;align-items:center}
.td-products{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.td-product{padding:26px 23px 27px;border-right:1px solid var(--line);text-align:left;min-width:0}.td-product:last-child{border-right:0}.td-product-icon{width:39px;height:39px;border-radius:50%;background:#e6ebdc;color:var(--green);display:grid;place-items:center;margin-bottom:22px;transition:transform .25s,background .25s}.td-product h3{font-size:24px;letter-spacing:-.02em;margin:8px 0}.td-product p{font-size:11px;line-height:1.75;color:var(--muted);margin:0}.td-product-link{display:block;color:inherit;text-decoration:none;transition:background .25s,transform .25s}.td-product-link:hover{background:#eef0e8;transform:translateY(-3px)}.td-product-action{display:block;width:100%;height:100%;background:transparent;border:0;cursor:pointer;transition:background .25s,transform .25s;text-align:left}.td-product-action:hover{background:#eef0e8;transform:translateY(-3px)}.td-product-action.is-selected{background:#e8eee2;box-shadow:inset 0 -3px var(--green)}.td-product-action.is-selected .td-product-icon{background:var(--green);color:#fff}.td-product-cta{display:flex;align-items:center;gap:7px;margin-top:17px;color:var(--green);font-size:10px;font-weight:800;transition:gap .2s}.td-product-link:hover .td-product-cta,.td-product-action:hover .td-product-cta{gap:11px}.td-product-action:focus-visible,.td-product-link:focus-visible{outline:3px solid #bd6845;outline-offset:3px;position:relative;z-index:1}.td-products-citygate{grid-template-columns:repeat(5,1fr)}
.td-process{background:var(--deep);color:#f3f1e6;position:relative;overflow:hidden}.td-process:after{content:"";position:absolute;right:-105px;bottom:-230px;width:520px;height:520px;border:1px solid #ffffff17;border-radius:50%;box-shadow:0 0 0 55px #ffffff08,0 0 0 110px #ffffff05}.td-process .td-eyebrow{color:var(--lime)}.td-process .td-section-head p{color:#c3d1c5}.td-steps{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #ffffff35;position:relative;z-index:1}.td-step{padding:25px 26px 7px 0;position:relative}.td-step:not(:last-child){border-right:1px solid #ffffff35}.td-step:not(:first-child){padding-left:26px}.td-step-num{font:italic 17px 'Instrument Serif',serif;color:var(--lime);letter-spacing:.05em}.td-step h3{font-size:29px;margin:22px 0 10px;letter-spacing:-.025em}.td-step p{font-size:11px;line-height:1.8;color:#bdccc2;max-width:270px}
.td-honesty{display:grid;grid-template-columns:.82fr 1.18fr;gap:90px;align-items:start}.td-honesty h2{font-size:clamp(42px,5vw,62px);line-height:.98;margin:18px 0}.td-honesty p{color:var(--muted);line-height:1.8;font-size:12px;max-width:330px}.td-honesty-list{border-top:1px solid var(--line)}.td-honesty-item{display:grid;grid-template-columns:36px 1fr;gap:14px;padding:21px 0;border-bottom:1px solid var(--line)}.td-honesty-item svg{color:var(--green);margin-top:2px}.td-honesty-item strong{font-size:12px;display:block;margin-bottom:6px}.td-honesty-item span{font-size:11px;color:var(--muted);line-height:1.7}
.td-footer{background:#e7ebe1;padding:26px 0;border-top:1px solid #d9ded2}.td-footer-inner{display:flex;align-items:center;justify-content:space-between;gap:20px}.td-footer p{font-size:10px;color:#68766d;margin:0}.td-footer-links{display:flex;gap:20px;font-size:10px;color:#46574f}.td-footer-links a:hover{text-decoration:underline;text-underline-offset:3px}
.td-city-hero{background:#e7ebe1;padding:42px 0 80px;position:relative}.td-city-hero-grid{display:grid;grid-template-columns:.92fr 1.08fr;gap:67px;align-items:center}.td-city-copy{padding:36px 0}.td-city-copy h1{font-size:clamp(58px,6.6vw,88px);line-height:.94;margin:22px 0 20px}.td-city-copy h1 span{color:var(--green);font-style:italic}.td-city-copy>p{font-size:13px;line-height:1.85;color:#65736b;max-width:475px}.td-city-hero-photo{height:530px;position:relative;border-radius:4px 190px 4px 4px;overflow:hidden;background:#d7e2d5}.td-city-hero-photo img{height:100%;width:100%;object-fit:cover;object-position:60% center}.td-image-caption{position:absolute;bottom:16px;left:16px;background:#fffdf2ed;padding:12px 15px;font-size:10px;font-weight:700;display:flex;gap:9px;align-items:center}.td-image-caption svg{color:var(--green)}.td-productstrip{display:flex;gap:7px;flex-wrap:wrap;margin-top:23px}.td-chip{display:inline-flex;gap:7px;align-items:center;padding:8px 10px;border:1px solid #cbd5c9;border-radius:2px;font-size:9px;font-weight:700;color:#43564b;background:#f5f6ef}
.td-citygate-context{margin-top:20px;padding:14px 16px;border-left:2px solid var(--copper);background:#fffdf6a8;color:#56665d;font-size:11px;line-height:1.75;max-width:490px}.td-citygate-context strong{color:var(--ink)}
.td-estimator-section{background:var(--deep);color:#f7f5ed;padding:100px 0;position:relative}.td-estimator-section:before{content:"";position:absolute;inset:0 0 auto;height:1px;background:#ffffff22}.td-estimator-grid{display:grid;grid-template-columns:.76fr 1.24fr;gap:75px;align-items:start}.td-estimator-intro{position:sticky;top:25px}.td-estimator-intro .td-eyebrow{color:var(--lime)}.td-estimator-intro h2{font-size:clamp(46px,5vw,68px);line-height:.96;margin:18px 0}.td-estimator-intro p{color:#c6d3c9;font-size:12px;line-height:1.85}.td-estimate-warning{border-left:2px solid var(--lime);padding:13px 0 13px 15px;margin-top:24px;color:#d3dfd5;font-size:10px;line-height:1.8}.td-estimator-card{background:var(--white);color:var(--ink);border-radius:3px;overflow:hidden;box-shadow:0 24px 70px #071f1930}.td-estimator-top{padding:25px 31px 19px;border-bottom:1px solid #e2e7de}.td-step-meta{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#718078;font-weight:800;display:flex;justify-content:space-between}.td-progress{height:3px;background:#e7ebe2;margin-top:15px;overflow:hidden}.td-progress span{height:100%;display:block;background:#a3bd68;transition:width .4s cubic-bezier(.2,.8,.2,1)}.td-form-body{padding:29px 31px 31px}.td-form-body h3{font-size:32px;margin:0 0 5px}.td-form-hint{font-size:11px;color:#718078;margin:0 0 22px}.td-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.td-field{display:flex;flex-direction:column;gap:7px;min-width:0}.td-field-full{grid-column:1/-1}.td-field label{font-size:10px;font-weight:700;color:#40534a}.td-field input,.td-field select{width:100%;height:44px;border:1px solid #d6dfd4;border-radius:2px;background:#fffdf6;padding:0 12px;color:#263930;outline:none;font-size:11px;transition:border-color .2s,box-shadow .2s}.td-field input:focus,.td-field select:focus{border-color:#31745b;box-shadow:0 0 0 3px #31745b1b}.td-field input::placeholder{color:#9ca79c}.td-field input[type="date"]{color-scheme:light}.td-form-actions{display:flex;justify-content:space-between;align-items:center;margin-top:24px;gap:12px}.td-form-actions .td-btn{min-width:146px}.td-privacy{font-size:9px;color:#738078;display:flex;gap:6px;align-items:center}.td-tenure-control{display:flex;align-items:center;gap:13px}.td-tenure-control input{accent-color:#28634f;padding:0;flex:1}.td-tenure-value{min-width:70px;font-weight:800;font-size:12px;color:#275740}.td-estimate-box{background:#edf1e6;border:1px solid #d8e3d4;border-radius:2px;padding:16px 18px;margin:18px 0}.td-estimate-label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#617168}.td-estimate-number{font-family:'Manrope',sans-serif;font-weight:700;font-size:31px;letter-spacing:-.06em;margin:5px 0}.td-estimate-box p{font-size:9px;line-height:1.7;color:#67766d;margin:0}.td-consent{display:flex;align-items:flex-start;gap:10px;font-size:10px;color:#5e6c63;line-height:1.6}.td-consent input{margin:2px 0 0;accent-color:#28634f;flex:0 0 auto}.td-success-state{text-align:center;padding:50px 30px}.td-success-icon{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#e5efdd;color:#2d674e;margin:0 auto 18px}.td-success-state h3{font-size:37px;margin:0 0 9px}.td-success-state p{font-size:11px;color:#68766e;line-height:1.8;max-width:425px;margin:0 auto 15px}.td-reference{padding:70px 0;background:#f5f3e9}.td-reference-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.td-reference-card{background:#e8ece2;padding:26px;display:flex;gap:16px;align-items:flex-start;border:1px solid #dce2d7}.td-reference-card svg{color:var(--green);flex:0 0 auto}.td-reference-card h3{font-size:22px;margin:0 0 7px}.td-reference-card p{font-size:10px;line-height:1.75;color:#66746b;margin:0}
.td-faq{padding:84px 0}.td-faq-grid{display:grid;grid-template-columns:.72fr 1.28fr;gap:72px}.td-faq h2{font-size:clamp(43px,5vw,60px);line-height:.97;margin:17px 0}.td-faq-list{border-top:1px solid var(--line)}.td-faq details{border-bottom:1px solid var(--line);padding:19px 0}.td-faq summary{list-style:none;display:flex;justify-content:space-between;gap:15px;cursor:pointer;font-size:11px;font-weight:700}.td-faq summary::-webkit-details-marker{display:none}.td-faq summary svg{flex:0 0 auto;transition:transform .25s}.td-faq details[open] summary svg{transform:rotate(180deg)}.td-faq details p{font-size:10px;color:var(--muted);line-height:1.8;max-width:600px;margin:13px 0 0}.td-city-footer{background:var(--deep);color:#f3f3e9;padding:29px 0}.td-city-footer .td-footer-inner p,.td-city-footer .td-footer-links{color:#c3d0c5}.td-city-footer .td-mark{background:#d8e9a3;color:var(--deep)}.td-error{background:#fff0e8;border:1px solid #e6b8a4;padding:12px 14px;color:#883a22;font-size:10px;border-radius:2px;margin-top:15px}
.td-loans a:focus-visible,.td-loans button:focus-visible,.td-loans summary:focus-visible{outline:3px solid #bd6845;outline-offset:3px}.td-reveal{animation:td-rise .7s both}.td-reveal-delay{animation-delay:.14s}@keyframes td-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.td-slider{isolation:isolate}.td-slider-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .75s ease}.td-slider-image.is-active{opacity:1}.td-slider-controls{position:absolute;z-index:2;right:14px;bottom:14px;display:flex;align-items:center;gap:7px;padding:6px;background:#173c31bb;backdrop-filter:blur(8px)}.td-slider-controls button{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;border:1px solid #ffffff80;background:#fffdf6;color:#1d2f2b;cursor:pointer;transition:background .2s,transform .2s}.td-slider-controls button:hover{background:#d8e9a3;transform:scale(1.06)}.td-slider-dots{display:flex;align-items:center;gap:5px;padding:0 4px}.td-slider-controls .td-slider-dot{width:7px;min-width:7px;height:7px;padding:0;border:0;background:#ffffff80}.td-slider-controls .td-slider-dot.is-active{width:18px;border-radius:99px;background:#d8e9a3}.td-city-hero-photo .td-slider-controls{bottom:62px}
@media(max-width:900px){.td-navlinks{display:none}.td-mobile-menu{display:grid;place-items:center;border:1px solid var(--line);background:transparent;width:40px;height:40px;border-radius:3px;color:var(--ink)}.td-navright>.td-quiet{display:none}.td-dir-grid,.td-city-hero-grid{grid-template-columns:1fr;gap:38px}.td-dir-hero{padding:48px 0 72px}.td-dir-copy{padding:0}.td-hero-visual{min-height:480px;max-width:600px;width:100%;margin:0 auto}.td-section{padding:72px 0}.td-products{grid-template-columns:1fr 1fr}.td-products-citygate{grid-template-columns:repeat(3,1fr)}.td-product:nth-child(2){border-right:0}.td-product:nth-child(-n+2){border-bottom:1px solid var(--line)}.td-honesty,.td-estimator-grid,.td-faq-grid{grid-template-columns:1fr;gap:32px}.td-estimator-intro{position:static}.td-city-hero-grid{gap:26px}.td-city-copy{padding:15px 0 0}.td-city-hero-photo{height:445px}.td-estimator-section{padding:72px 0}.td-lender-card{grid-template-columns:1fr 1fr}.td-lender-content{padding:30px}.td-lender-foot{align-items:flex-start;flex-direction:column}.td-lender-content h3{font-size:37px;margin-top:25px}.td-estimator-intro p{max-width:650px}}
@media(max-width:600px){.td-wrap{width:min(100% - 34px,1190px)}.td-nav{height:68px}.td-brand{font-size:18px}.td-navright .td-btn{padding:10px 11px;font-size:10px}.td-dir-copy h1{font-size:60px}.td-lede{font-size:13px}.td-dir-actions{align-items:flex-start;flex-direction:column;gap:16px}.td-hero-visual{min-height:365px}.td-hero-photo{right:10px;border-radius:145px 145px 3px 3px}.td-photo-tag{left:-4px;padding:11px}.td-orbit{right:-3px;font-size:7px}.td-section-head{align-items:flex-start;flex-direction:column;margin-bottom:27px}.td-section-head h2{font-size:45px}.td-lender-card{grid-template-columns:1fr}.td-lender-image{min-height:270px;order:-1}.td-lender-content{padding:26px}.td-lender-content h3{font-size:34px}.td-lender-foot{padding-top:24px}.td-products{grid-template-columns:1fr 1fr}.td-products-citygate{grid-template-columns:1fr 1fr}.td-product{padding:18px 13px}.td-product h3{font-size:21px}.td-product p{font-size:10px}.td-product-icon{margin-bottom:16px}.td-steps{grid-template-columns:1fr}.td-step,.td-step:not(:first-child){padding:18px 0;border-right:0;border-bottom:1px solid #ffffff36}.td-step:last-child{border-bottom:0}.td-step h3{margin:12px 0 6px}.td-honesty{gap:14px}.td-footer-inner{align-items:flex-start;flex-direction:column}.td-footer-links{flex-wrap:wrap}.td-city-copy h1{font-size:60px}.td-city-hero{padding:28px 0 58px}.td-city-hero-photo{height:340px;border-radius:4px 125px 4px 4px}.td-chip{font-size:8px;padding:7px}.td-estimator-card{margin:0 -1px}.td-estimator-top{padding:20px}.td-form-body{padding:22px 19px}.td-field-grid{grid-template-columns:1fr;gap:13px}.td-field-full{grid-column:auto}.td-form-actions{align-items:stretch;flex-direction:column-reverse}.td-form-actions .td-btn{width:100%}.td-form-actions button.td-btn-outline{order:1}.td-privacy{justify-content:center}.td-reference-grid{grid-template-columns:1fr}.td-faq h2{font-size:45px}.td-faq-grid{gap:12px}.td-city-footer .td-footer-inner{gap:14px}.td-footer p{max-width:300px}}
@media(max-width:390px){.td-navright .td-btn{font-size:0;gap:0;padding:10px}.td-navright .td-btn svg{width:17px}.td-dir-copy h1,.td-city-copy h1{font-size:54px}.td-products-citygate{grid-template-columns:1fr}.td-products-citygate .td-product{border-right:0;border-bottom:1px solid var(--line)}.td-products-citygate .td-product:last-child{border-bottom:0}}
@media(max-width:900px){.td-mobile-links{display:flex;flex-direction:column;gap:0;position:relative;z-index:11;margin:-2px auto 12px;width:min(1190px,calc(100% - 56px));padding:7px;background:var(--white);border:1px solid var(--line);box-shadow:0 14px 32px #1b392616}.td-mobile-links a{padding:12px 10px;font-size:12px;font-weight:700;border-bottom:1px solid var(--line)}.td-mobile-links a:last-child{border:0}}
@media(prefers-reduced-motion:reduce){.td-reveal{animation:none}.td-loans *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}.td-slider-controls button:hover{transform:none}}
.td-citygate-page .td-eyebrow{font-size:11px;letter-spacing:.12em}
.td-citygate-page .td-navlinks,.td-citygate-page .td-navright .td-quiet{font-size:14px}
.td-citygate-page .td-btn{font-size:14px}
.td-citygate-page .td-textlink{font-size:14px}
.td-citygate-page .td-city-copy>p{font-size:16px;line-height:1.75;color:#46554c}
.td-citygate-page .td-citygate-context{font-size:14px;line-height:1.75;color:#435249}
.td-citygate-page .td-chip{font-size:12px}
.td-citygate-page .td-image-caption{font-size:12px}
.td-citygate-page .td-section-head p{font-size:15px;line-height:1.75;color:#48564d}
.td-citygate-page .td-product p{font-size:14px;line-height:1.7;color:#46554c}
.td-citygate-page .td-product-cta{font-size:12px}
.td-citygate-page .td-estimator-intro p{font-size:16px;line-height:1.8;color:#d8e2da}
.td-citygate-page .td-estimate-warning{font-size:13px;line-height:1.8;color:#e0e9e1}
.td-citygate-page .td-step-meta{font-size:11px}
.td-citygate-page .td-form-hint{font-size:14px;line-height:1.6;color:#59675e}
.td-citygate-page .td-field label{font-size:13px;color:#33483d}
.td-citygate-page .td-field input,.td-citygate-page .td-field select{font-size:16px}
.td-citygate-page .td-tenure-value{font-size:14px}
.td-citygate-page .td-estimate-label{font-size:11px}
.td-citygate-page .td-estimate-box p{font-size:13px;line-height:1.7;color:#4d5c52}
.td-citygate-page .td-privacy{font-size:12px}
.td-citygate-page .td-consent{font-size:13px;line-height:1.7;color:#46554c}
.td-citygate-page .td-success-state p{font-size:14px;line-height:1.8}
.td-citygate-page .td-reference-card p{font-size:14px;line-height:1.75;color:#4d5a51}
.td-citygate-page .td-faq summary{font-size:15px}
.td-citygate-page .td-faq details p{font-size:14px;line-height:1.8;color:#4d5a51}
.td-citygate-page .td-footer-inner p,.td-citygate-page .td-footer-links{font-size:13px}
.td-citygate-page .td-error{font-size:14px}
`;

function HeroPhotoSlider({ citygate = false }: { citygate?: boolean }) {
  const [active, setActive] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const slides = citygate
    ? [
        { src: homePlanningImage, alt: "A Nigerian couple reviewing plans and costs for home improvements" },
        { src: directoryImage, alt: "A Nigerian small-business owner reviewing plans with a customer" },
      ]
    : [
        { src: directoryImage, alt: "A Nigerian small-business owner reviewing plans with a customer" },
        { src: homePlanningImage, alt: "A Nigerian couple reviewing plans and costs for their home" },
      ];

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setAutoPlay(false);
    };
    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!autoPlay || reducedMotion) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 7200);
    return () => window.clearInterval(timer);
  }, [autoPlay, reducedMotion, slides.length]);

  return (
    <div className={`${citygate ? "td-city-hero-photo" : "td-hero-photo"} td-slider`} role="region" aria-roledescription="carousel" aria-label={citygate ? "Citygate loan options photographs" : "Taskdrip loans directory photographs"}>
      {slides.map((slide, index) => (
        <img key={slide.src} className={`td-slider-image${active === index ? " is-active" : ""}`} src={slide.src} alt={slide.alt} aria-hidden={active !== index} />
      ))}
      {citygate && <span className="td-image-caption"><Building2 size={15} /> Citygate Global · Loan options</span>}
      <div className="td-slider-controls" role="group" aria-label="Image controls">
        <button type="button" aria-label="Show previous image" onClick={() => setActive((current) => (current + slides.length - 1) % slides.length)}><ArrowLeft size={14} /></button>
        <div className="td-slider-dots" aria-label={`Image ${active + 1} of ${slides.length}`}>
          {slides.map((slide, index) => <button key={slide.src} type="button" className={`td-slider-dot${active === index ? " is-active" : ""}`} aria-label={`Show image ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)} />)}
        </div>
        <button type="button" aria-label="Show next image" onClick={() => setActive((current) => (current + 1) % slides.length)}><ArrowRight size={14} /></button>
        <button type="button" aria-label={reducedMotion ? "Automatic image rotation disabled by motion preference" : autoPlay ? "Pause automatic image rotation" : "Play automatic image rotation"} aria-pressed={autoPlay} disabled={reducedMotion} onClick={() => setAutoPlay((playing) => !playing)}>{autoPlay ? <Pause size={13} /> : <Play size={13} />}</button>
      </div>
    </div>
  );
}

function Logo({ citygate = false }: { citygate?: boolean }) {
  return citygate ? (
    <span className="td-citygate-mark"><span className="td-citygate-symbol"><Building2 size={16} /></span> CITYGATE GLOBAL</span>
  ) : (
    <span className="td-brand"><span className="td-mark">t</span><span>taskdrip<small>loans directory</small></span></span>
  );
}

function PublicNav({ citygate = false }: { citygate?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="td-wrap">
      <nav className="td-nav" aria-label="Main navigation">
        <Link href="/loans" aria-label="Taskdrip loans directory home"><Logo /></Link>
        <div className="td-navlinks">
          <a href={citygate ? "#loan-options" : "#lenders"}>Loan options</a>
          <a href={citygate ? "#estimate" : "#how-it-works"}>{citygate ? "Cash-flow estimate" : "How it works"}</a>
          <a href={citygate ? "#questions" : "#about-directory"}>{citygate ? "Questions" : "About"}</a>
        </div>
        <div className="td-navright">
          <Link href="/loans" className="td-quiet">Directory</Link>
          <a className="td-btn" href={citygate ? "#estimate" : "/citygate-global-loans"}>{citygate ? "Build an estimate" : "Explore Citygate"} <ArrowRight size={14} /></a>
          <button type="button" className="td-mobile-menu" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </nav>
      {open && <div className="td-mobile-links"><a href={citygate ? "#loan-options" : "#lenders"} onClick={() => setOpen(false)}>Loan options</a><a href={citygate ? "#estimate" : "#how-it-works"} onClick={() => setOpen(false)}>{citygate ? "Cash-flow estimate" : "How it works"}</a><a href={citygate ? "#questions" : "#about-directory"} onClick={() => setOpen(false)}>{citygate ? "Questions" : "About the directory"}</a><Link href="/loans" onClick={() => setOpen(false)}>Directory home</Link></div>}
    </div>
  );
}

const products = [
  { icon: Wallet, title: "Payday", label: "Private sector", copy: "For eligible salary earners in private companies.", loanType: "payday" },
  { icon: Landmark, title: "Payroll", label: "Public sector", copy: "For eligible workers in public-sector organisations.", loanType: "payroll" },
  { icon: BriefcaseBusiness, title: "SME working capital", label: "For businesses", copy: "Explore working capital options for a business need.", loanType: "sme" },
  { icon: House, title: "Asset financing", label: "For planned purchases", copy: "Financing options for assets and home improvements.", loanType: "asset" },
] as const;
const citygateProducts = [
  ...products,
  { icon: HandCoins, title: "Monee", label: "Citygate service", copy: "Monee is a Citygate Global service. Contact Citygate Global for service details, eligibility and current terms.", loanType: "monee" as const },
];
const loanPlatforms = [
  {
    slug: "citygate-global",
    name: "Citygate Global",
    href: "/citygate-global-loans",
    external: false,
    label: "Lender product information",
    heading: "Options for work, business and the things you’re building.",
    description: "Citygate Global Investment Limited is the first lender featured in the Taskdrip loans directory. Its listed categories include salary-based lending, SME working capital, asset financing and its Monee service.",
    image: directoryImage,
    imageAlt: "A Nigerian small-business owner reviewing plans with a customer",
    imageLabel: "For individuals and growing businesses",
  },
];

export default function LoansDirectory() {
  return (
    <main className="td-loans">
      <style>{pageStyles}</style>
      <PublicNav />
      <section className="td-dir-hero">
        <div className="td-wrap td-dir-grid">
          <div className="td-dir-copy td-reveal">
            <span className="td-eyebrow">Loan options, with room to think</span>
            <h1>Start with the facts. <em>Then choose.</em></h1>
            <p className="td-lede">Taskdrip is a Nigerian loan-options directory. Explore lender products, understand a simple cash-flow illustration and decide whether you want to contact the lender directly.</p>
            <div className="td-dir-actions">
              <Link href="/citygate-global-loans" className="td-btn">Explore Citygate options <ArrowRight size={15} /></Link>
              <a className="td-textlink" href="#how-it-works">How this directory works <ArrowDownRight size={15} /></a>
            </div>
            <div className="td-trustline"><ShieldCheck size={16} /><span>Clear information. No promises of approval.</span></div>
          </div>
          <div className="td-hero-visual td-reveal td-reveal-delay">
            <HeroPhotoSlider />
            <span className="td-orbit">A steadier way to explore</span>
            <div className="td-photo-tag"><span className="td-photo-tag-icon"><FileCheck2 size={17} /></span><span><strong>Start with the details</strong><span>Know what to ask before you apply</span></span></div>
          </div>
        </div>
      </section>
      <section id="lenders" className="td-section td-lenders">
        <div className="td-wrap">
          <div className="td-section-head"><div><span className="td-eyebrow">Lender directory · {String(loanPlatforms.length).padStart(2, "0")}</span><h2>A first option worth a closer look.</h2></div><p>Today, explore Citygate Global. Browse its product categories and use a non-binding illustration before deciding what to do next.</p></div>
          {loanPlatforms.map((platform) => (
            <article className="td-lender-card" key={platform.slug}>
              <div className="td-lender-content">
                {platform.slug === "citygate-global" ? <Logo citygate /> : <span className="td-citygate-mark"><span className="td-citygate-symbol"><Building2 size={16} /></span>{platform.name}</span>}
                <h3>{platform.heading}</h3>
                <p>{platform.description}</p>
                <div className="td-lender-foot">
                  <span><BadgeCheck size={15} /> {platform.label}</span>
                  {platform.external
                    ? <a href={platform.href} target="_blank" rel="noopener noreferrer" className="td-btn">Visit lender details <ArrowUpRight size={14} /></a>
                    : <Link href={platform.href} className="td-btn">View lender details <ArrowUpRight size={14} /></Link>}
                </div>
              </div>
              <div className="td-lender-image"><img src={platform.image} alt={platform.imageAlt} /><span className="td-lender-image-label">{platform.imageLabel}</span></div>
            </article>
          ))}
          <div className="td-more-note"><CircleHelp size={14} /> Taskdrip is a directory, not a lender. More partners can be added here as verified product details and links are confirmed.</div>
        </div>
      </section>
      <section id="about-directory" className="td-section">
        <div className="td-wrap">
          <div className="td-section-head"><div><span className="td-eyebrow">Start with what you need</span><h2>Different plans. Different kinds of lending.</h2></div><p>Product descriptions are a starting point, not an eligibility decision. Confirm requirements and terms directly with the lender.</p></div>
          <div className="td-products">{products.map(({ icon: Icon, title, label, copy, loanType }) => <Link key={title} href={`/citygate-global-loans?product=${loanType}`} className="td-product td-product-link" aria-label={`Explore Citygate Global ${title} and open the estimate`}><span className="td-product-icon"><Icon size={18} /></span><span className="td-eyebrow">{label}</span><h3>{title}</h3><p>{copy}</p><span className="td-product-cta">Choose this option <ArrowRight size={13} /></span></Link>)}</div>
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
            <div className="td-honesty-item"><ShieldCheck size={18} /><div><strong>No guaranteed access or approval</strong><span>Only the lender can assess eligibility and decide whether to offer a loan.</span></div></div>
            <div className="td-honesty-item"><FileCheck2 size={18} /><div><strong>Terms can vary</strong><span>Confirm current rates, fees, requirements and repayment details with the lender directly.</span></div></div>
            <div className="td-honesty-item"><LockKeyhole size={18} /><div><strong>Share information thoughtfully</strong><span>Review any application details and consent choices before sending them.</span></div></div>
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

const rupee = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const money = (value: number) => `₦${rupee.format(Math.max(0, Math.round(value)))}`;

function readableApiError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const responseBody = error.message.match(/^\d{3}:\s*([\s\S]*)$/)?.[1];
  if (responseBody) {
    try {
      const payload = JSON.parse(responseBody);
      if (typeof payload?.message === "string") return payload.message;
    } catch {
      return fallback;
    }
    return fallback;
  }
  return error.message || fallback;
}

function Field({ label, name, value, onChange, type = "text", placeholder, required = false, min, max, children }: {
  label: string; name: string; value?: string; onChange?: (value: string) => void; type?: string; placeholder?: string;
  required?: boolean; min?: string; max?: string; children?: ReactNode;
}) {
  return <div className="td-field"><label htmlFor={name}>{label}{required && " *"}</label>{children || <input id={name} name={name} type={type} value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} required={required} min={min} max={max} />}</div>;
}

export function CitygateLoansPage() {
  const [data, setData] = useState<ApplicationData>(() => {
    if (typeof window === "undefined") return initialApplication;
    const selectedProduct = new URLSearchParams(window.location.search).get("product");
    const selectedLoan = selectedProduct && Object.hasOwn(loanNames, selectedProduct)
      ? selectedProduct as LoanType
      : initialApplication.loanType;
    return { ...initialApplication, loanType: selectedLoan };
  });
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [whatsappRedirect, setWhatsappRedirect] = useState(false);
  const [result, setResult] = useState<{ id: string; estimateNaira: number; estimateBasis: string; emailSent: boolean } | null>(null);
  const cashFlow = useMemo(() => {
    const income = Number(data.monthlyNetIncome) || 0;
    return income > 0 ? income : (Number(data.sixMonthTurnover) || 0) / 6;
  }, [data.monthlyNetIncome, data.sixMonthTurnover]);
  const capacity = Math.floor(cashFlow * .3 * data.tenureMonths);
  const requestedAmount = Number(data.requestedAmount) || 0;
  const estimate = requestedAmount > 0 ? Math.min(requestedAmount, capacity) : capacity;
  const whatsappMessage = [
    "Citygate Global loan enquiry — Taskdrip",
    `Application reference: ${result?.id || ""}`,
    `Full name: ${data.fullName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Date of birth: ${data.dateOfBirth}`,
    `State of residence: ${data.state}`,
    `Loan option: ${loanNames[data.loanType]}`,
    `Employment status: ${data.employmentStatus || "Not provided"}`,
    `Business type: ${data.businessType || "Not provided"}`,
    `Product or service sold: ${data.productSold || "Not provided"}`,
    `Six-month turnover (NGN): ${data.sixMonthTurnover || "Not provided"}`,
    `Monthly net income (NGN): ${data.monthlyNetIncome || "Not provided"}`,
    `Asset amount (NGN): ${data.assetAmount || "Not provided"}`,
    `Requested amount (NGN): ${data.requestedAmount || "Not provided"}`,
    `Illustration term: ${data.tenureMonths} months`,
    `Application sharing consent: ${data.consent ? "Yes" : "No"}`,
    `Optional product updates consent: ${data.marketingConsent ? "Yes" : "No"}`,
    `Returned estimate: ${result ? money(result.estimateNaira) : money(estimate)}`,
    `Estimate basis: ${result?.estimateBasis || "Deterministic cash-flow illustration; non-binding, not credit underwriting."}`,
  ].join("\n");
  const whatsappUrl = `https://wa.me/2347081024793?text=${encodeURIComponent(whatsappMessage)}`;
  useEffect(() => {
    if (!result || !whatsappRedirect) return;
    const timer = window.setTimeout(() => window.location.assign(whatsappUrl), 1800);
    return () => window.clearTimeout(timer);
  }, [result, whatsappRedirect, whatsappUrl]);
  const update = (key: keyof ApplicationData, value: string | number | boolean) => {
    setError("");
    setSubmissionFailed(false);
    setData((previous) => ({ ...previous, [key]: value }));
  };
  const scrollToEstimate = () => document.getElementById("estimate")?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
  const selectOffer = (loanType: LoanType) => {
    update("loanType", loanType);
    setError("");
    setStep(1);
    scrollToEstimate();
  };
  useEffect(() => {
    const selectedProduct = new URLSearchParams(window.location.search).get("product");
    if (!selectedProduct || !Object.hasOwn(loanNames, selectedProduct)) return;
    window.requestAnimationFrame(() => document.getElementById("estimate")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    }));
  }, []);
  const next = () => {
    setError("");
    if (step === 1 && !data.loanType) setError("Choose a loan option to continue.");
    else if (step === 1 && !data.employmentStatus) setError("Select your employment status to continue.");
    else setStep(2);
  };
  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmissionFailed(false);
    if (data.fullName.trim().length < 2) { setError("Enter your full name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) { setError("Enter a valid email address."); return; }
    if (data.phone.trim().length < 7 || data.phone.trim().length > 24 || !/^[+()\d\s.-]+$/.test(data.phone.trim())) { setError("Enter a valid phone number."); return; }
    if (!data.dateOfBirth || !data.state.trim()) { setError("Enter your date of birth and state of residence."); return; }
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
      setWhatsappRedirect(true);
    } catch (submitError) {
      setError(readableApiError(submitError, "We could not confirm that your enquiry was saved. Please try again."));
      setSubmissionFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="td-loans td-citygate-page">
      <style>{pageStyles}</style>
      <PublicNav citygate />
      <section className="td-city-hero">
        <div className="td-wrap td-city-hero-grid">
          <div className="td-city-copy td-reveal">
            <span className="td-eyebrow">Taskdrip lender directory · Citygate Global</span>
            <h1>Make room for what <span>you’re building.</span></h1>
            <p>Explore Citygate Global Investment Limited loan options for salary earners, SMEs and people planning an asset purchase or home improvement. Start with the details that matter to you.</p>
            <div className="td-citygate-context"><strong>Citygate Global Investment Limited</strong> is featured in the Taskdrip loans directory, with product categories for salary-based lending, SME working capital, asset financing and its Monee service.</div>
            <div className="td-dir-actions"><button type="button" className="td-btn" onClick={scrollToEstimate}>Build a cash-flow estimate <ArrowRight size={15} /></button><Link href="/loans" className="td-textlink"><ArrowLeft size={14} /> Back to all loan options</Link></div>
            <div className="td-productstrip"><span className="td-chip"><Wallet size={12} /> Payday</span><span className="td-chip"><Landmark size={12} /> Payroll</span><span className="td-chip"><BriefcaseBusiness size={12} /> SME working capital</span><span className="td-chip"><House size={12} /> Asset financing</span><span className="td-chip"><HandCoins size={12} /> Monee service</span></div>
          </div>
          <div className="td-reveal td-reveal-delay"><HeroPhotoSlider citygate /></div>
        </div>
      </section>
      <section id="loan-options" className="td-section">
        <div className="td-wrap">
          <div className="td-section-head"><div><span className="td-eyebrow">Options to explore</span><h2>Start with the need in front of you.</h2></div><p>These are product categories supplied for Citygate Global. Ask the lender for current eligibility, requirements and official terms.</p></div>
          <div className="td-products td-products-citygate">{citygateProducts.map(({ icon: Icon, title, label, copy, loanType }) => <button key={title} type="button" className={`td-product td-product-action${data.loanType === loanType ? " is-selected" : ""}`} aria-pressed={data.loanType === loanType} onClick={() => selectOffer(loanType)}><span className="td-product-icon"><Icon size={18} /></span><span className="td-eyebrow">{label}</span><h3>{title}</h3><p>{copy}</p><span className="td-product-cta">Choose & estimate <ArrowRight size={13} /></span></button>)}</div>
        </div>
      </section>
      <section id="estimate" className="td-estimator-section">
        <div className="td-wrap td-estimator-grid">
          <div className="td-estimator-intro"><span className="td-eyebrow">A clear first look</span><h2>Estimate with your cash flow in mind.</h2><p>Share a few details to create a deterministic, non-binding illustration. It is not a loan decision, does not set official Citygate terms, and does not guarantee access or approval. No AI credit underwriting is performed.</p><div className="td-estimate-warning">Calculation: the lower of your requested amount (if entered) and 30% of monthly cash flow × chosen term. Cash flow uses monthly net income; if that is zero, it uses six-month turnover ÷ 6. Term: 1–6 months. Interest and fees are excluded.</div></div>
          <section className="td-estimator-card" aria-label="Citygate Global loan application and estimate">
            {result ? (
              <div className="td-success-state">
                <span className="td-success-icon"><Check size={25} /></span>
                <h3>Details received</h3>
                <p>Your reference is <strong>{result.id}</strong>. The estimate returned is <strong>{money(result.estimateNaira)}</strong>. This is a deterministic, non-binding cash-flow illustration—not AI credit underwriting, lender approval or official terms.</p>
                <p>{result.emailSent ? "Your enquiry email was sent to Taskdrip and Citygate Global." : "Your details were saved. Email delivery could not be confirmed."}</p>
                <p>Opening a WhatsApp message to Citygate Global now. Your details will be prefilled for your review; WhatsApp will ask you to tap Send.</p>
                <a className="td-btn" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> Open WhatsApp now</a>
                {whatsappRedirect && <button type="button" className="td-btn td-btn-outline" style={{ margin: "12px 0 0 10px" }} onClick={() => setWhatsappRedirect(false)}>Stay on this page</button>}
                <div style={{ marginTop: 12 }}><button type="button" className="td-btn td-btn-outline" onClick={() => { setWhatsappRedirect(false); setResult(null); setData(initialApplication); setStep(1); }}>Start another estimate</button></div>
              </div>
            ) : (
              <>
                <div className="td-estimator-top"><div className="td-step-meta"><span>Application & estimate</span><span>Step {step} of 2</span></div><div className="td-progress" role="progressbar" aria-label="Application progress" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step}><span style={{ width: step === 1 ? "50%" : "100%" }} /></div></div>
                <form onSubmit={submitApplication} noValidate>
                  {step === 1 ? <div className="td-form-body">
                    <h3>What are you planning?</h3><p className="td-form-hint">Choose a product and share a little about income or business cash flow.</p>
                    <div className="td-field-grid">
                      <Field label="Loan option" name="loanType" required><select id="loanType" value={data.loanType} onChange={(e) => update("loanType", e.target.value as LoanType)}>{Object.entries(loanNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
                      <Field label="Employment status" name="employmentStatus" required><select id="employmentStatus" value={data.employmentStatus} onChange={(e) => update("employmentStatus", e.target.value)} required><option value="">Select your status</option><option value="employed-private">Employed — private sector</option><option value="employed-public">Employed — public sector</option><option value="self-employed">Self-employed</option><option value="business-owner">Business owner</option><option value="other">Other</option></select></Field>
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
                    <div className="td-estimate-box"><span className="td-estimate-label">Illustrative amount</span><div className="td-estimate-number" aria-live="polite">{money(estimate)}</div><p>{cashFlow > 0 ? `${money(cashFlow)} monthly cash flow × 30% × ${data.tenureMonths} months${data.requestedAmount ? `, capped at requested ${money(Number(data.requestedAmount))}` : ""}.` : "Enter monthly net income or eligible business turnover to see an illustration."} Excludes interest and fees.</p></div>
                    <div className="td-form-actions"><span className="td-privacy"><LockKeyhole size={12} /> Review details before sharing.</span><button type="button" className="td-btn" onClick={next}>Continue <ArrowRight size={14} /></button></div>
                  </div> : <div className="td-form-body">
                    <h3>Your contact details</h3><p className="td-form-hint">The details below accompany your enquiry to Citygate Global.</p>
                    <div className="td-field-grid">
                      <Field label="Full name" name="fullName" value={data.fullName} onChange={(v) => update("fullName", v)} required placeholder="As shown on your ID" />
                      <Field label="Email address" name="email" value={data.email} onChange={(v) => update("email", v)} required type="email" placeholder="you@example.com" />
                      <Field label="Phone number" name="phone" value={data.phone} onChange={(v) => update("phone", v)} required type="tel" placeholder="+234" />
                      <Field label="Date of birth" name="dateOfBirth" value={data.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} required type="date" max={new Date().toISOString().slice(0, 10)} />
                      <Field label="State of residence" name="state" value={data.state} onChange={(v) => update("state", v)} required placeholder="e.g. Lagos" />
                      <div className="td-field td-field-full"><div className="td-estimate-box"><span className="td-estimate-label">Your non-binding illustration</span><div className="td-estimate-number">{money(estimate)}</div><p>{loanNames[data.loanType]} · {data.tenureMonths} month term. This is not approval or an official offer.</p></div></div>
                      <label className="td-consent td-field-full"><input type="checkbox" checked={data.consent} onChange={(e) => update("consent", e.target.checked)} /><span>I consent to Taskdrip sending the details above to Citygate Global by email and WhatsApp for this enquiry. I understand Citygate Global determines eligibility and terms. *</span></label>
                      <label className="td-consent td-field-full"><input type="checkbox" checked={data.marketingConsent} onChange={(e) => update("marketingConsent", e.target.checked)} /><span>I would like to receive optional product updates. This choice is not required to submit an enquiry.</span></label>
                    </div>
                    <div className="td-form-actions"><button type="button" className="td-btn td-btn-outline" onClick={() => { setError(""); setStep(1); }}><ArrowLeft size={14} /> Back</button><button type="submit" className="td-btn" disabled={submitting}>{submitting ? "Sending details…" : "Submit enquiry"} {!submitting && <ArrowRight size={14} />}</button></div>
                    {error && <div className="td-error" role="alert"><p>{error}</p>{submissionFailed && <><a className="td-textlink" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> Contact Citygate on WhatsApp instead</a><small style={{ display: "block", marginTop: 7 }}>This WhatsApp fallback will not save an application in the Taskdrip admin dashboard or send the enquiry emails.</small></>}</div>}
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
          <article className="td-reference-card"><ShieldCheck size={20} /><div><h3>Estimate, not an offer</h3><p>The calculation is a non-binding cash-flow illustration. It is not lender approval, a credit decision or official Citygate terms.</p></div></article>
          <article className="td-reference-card"><FileCheck2 size={20} /><div><h3>Confirm the full picture</h3><p>Ask Citygate Global directly about eligibility, rates, fees, documentation and repayment before making a decision.</p></div></article>
        </div>
      </section>
      <section id="questions" className="td-faq">
        <div className="td-wrap td-faq-grid">
          <div><span className="td-eyebrow">Before you continue</span><h2>Questions, answered plainly.</h2><p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: 11 }}>Understanding the limits of an estimate is part of making an informed choice.</p></div>
          <div className="td-faq-list">
            <details><summary>Does this estimate mean my loan is approved?<ChevronDown size={16} /></summary><p>No. It is a cash-flow illustration only. Citygate Global independently reviews applications and determines eligibility, approval, terms and any offer.</p></details>
            <details><summary>How is the estimate worked out?<ChevronDown size={16} /></summary><p>It is the lower of the requested amount, if you enter one, and 30% of monthly cash flow multiplied by your selected term in months. Monthly net income is used; if it is zero, six-month business turnover divided by six is used. The term is 1–6 months. Interest and fees are excluded.</p></details>
            <details><summary>Where can I confirm rates, fees and requirements?<ChevronDown size={16} /></summary><p>Contact Citygate Global directly for current official product terms, eligibility requirements and any associated rates or fees. None are represented by this illustration.</p></details>
            <details><summary>What happens when I submit my enquiry?<ChevronDown size={16} /></summary><p>Your application details are submitted to the Citygate Global loans application endpoint. Submission does not guarantee an email, follow-up, approval or access to a loan.</p></details>
          </div>
        </div>
      </section>
      <footer className="td-city-footer"><div className="td-wrap td-footer-inner"><Link href="/loans"><Logo /></Link><p>Taskdrip is a directory, not a lender. Estimate excludes interest and fees.</p><div className="td-footer-links"><Link href="/loans">Back to directory</Link><a href="#estimate">Build an estimate</a></div></div></footer>
    </main>
  );
}
