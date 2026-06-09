const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/jspdf.es.min-BNW7lZUA.js","assets/index-B555w_gn.js","assets/index-DQ_69rxJ.css"])))=>i.map(i=>d[i]);
import{aj as O,k as _,i as q,r as T,u as D,j as e,O as F,L as W,e as w,d as B,ab as U,ao as Y,w as K}from"./index-B555w_gn.js";import{N as G,S as J}from"./navigation-fixed-OkQ4TRQB.js";import{T as V}from"./trophy-C6qlq5Kg.js";import{A as Q}from"./arrow-left-Cqmt3Qp-.js";import{L as A}from"./loader-circle-CN_L-Xx9.js";import"./avatar-DYra2yZ6.js";import"./dropdown-menu-CMnnQFZm.js";import"./index-DYwiAQ4k.js";import"./index-CcJQi08I.js";import"./chevron-right-eHp1NKXI.js";import"./check-Ce_-l_3r.js";import"./crown-Da0_Dbsp.js";import"./message-circle-BB_C-PEY.js";import"./user-CecVHaDE.js";import"./settings-DbdgjoTG.js";import"./wallet-ClgvShny.js";import"./landmark-DvysHzG2.js";import"./graduation-cap-gG-Ua3fJ.js";import"./package-Cr8AEFHp.js";import"./credit-card-D7JwQ3_e.js";import"./megaphone-BpH18_Mk.js";function X(a){try{return new Date(a).toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"})}catch{return""}}function Z(a,t){let s=a||"";for(const[l,x]of Object.entries(t))s=s.replace(new RegExp(`{{\\s*${l}\\s*}}`,"g"),x);return s}function ee(a,t,s){const i=(t==null?void 0:t.accentColor)||"#7c3aed",d=(t==null?void 0:t.bgColor)||"#fdfaf6",o=(t==null?void 0:t.institutionName)||"BreedSkool Academy",m=(t==null?void 0:t.headlineText)||"Certificate of Completion",r=a.studentName||"Student",b=a.courseTitle||(s==null?void 0:s.title)||"Course",p=X(a.issuedAt),v=a.instructorName||"",f=Z((t==null?void 0:t.bodyTemplate)||"",{studentName:r,courseTitle:b,date:p,instructorName:v}),g=(t==null?void 0:t.signatoryName)||"",j=(t==null?void 0:t.signatoryTitle)||"",L=a.certCode||"",c=(t==null?void 0:t.institutionLogoUrl)||"",u=(t==null?void 0:t.signatureImageUrl)||"",N=(t==null?void 0:t.sealImageUrl)||"",k=(t==null?void 0:t.borderStyle)||"classic",n=y=>String(y||"").replace(/[&<>'"]/g,h=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&apos;",'"':"&quot;"})[h]||h),P=((y,h)=>{const H=y.split(/\s+/),R=[];let $="";for(const S of H)($+" "+S).trim().length>h?(R.push($),$=S):$=($+" "+S).trim();return $&&R.push($),R})(f,75).slice(0,4),I=k==="ornate",E=k==="modern",C=(y,h,H=!1)=>`
    <g transform="translate(${y} ${h}) ${H?"scale(-1 1)":""}">
      <path d="M0 0 L70 0 M0 0 L0 70" stroke="${i}" stroke-width="3" fill="none"/>
      <circle cx="14" cy="14" r="5" fill="${i}"/>
    </g>`;return`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1131" viewBox="0 0 1600 1131">
  <defs>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${i}"/>
      <stop offset="1" stop-color="${i}" stop-opacity="0.6"/>
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="${i}" fill-opacity="0.08"/>
    </pattern>
  </defs>

  <!-- background -->
  <rect width="1600" height="1131" fill="${d}"/>
  ${I?'<rect width="1600" height="1131" fill="url(#dots)"/>':""}

  <!-- outer & inner borders -->
  <rect x="40" y="40" width="1520" height="1051" fill="none" stroke="${i}" stroke-width="${E?2:6}"/>
  <rect x="60" y="60" width="1480" height="1011" fill="none" stroke="${i}" stroke-width="1" stroke-dasharray="${E?"0":"4 6"}" stroke-opacity="0.6"/>

  <!-- corner flourishes (ornate only) -->
  ${I?C(80,80)+C(1520,80,!0)+C(80,1051)+C(1520,1051,!0):""}

  <!-- top accent bar -->
  <rect x="60" y="60" width="1480" height="6" fill="url(#accentGrad)"/>

  <!-- logo -->
  ${c?`<image href="${n(c)}" x="${1600/2-70}" y="100" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>`:""}

  <!-- institution -->
  <text x="${1600/2}" y="${c?285:180}" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="${i}" font-weight="700" letter-spacing="3">${n(o.toUpperCase())}</text>

  <!-- headline -->
  <text x="${1600/2}" y="${c?380:280}" text-anchor="middle" font-family="Georgia, serif" font-size="68" fill="#1f2937" font-weight="700">${n(m)}</text>

  <!-- decorative line -->
  <line x1="${1600/2-120}" y1="${c?410:310}" x2="${1600/2+120}" y2="${c?410:310}" stroke="${i}" stroke-width="2"/>

  <!-- presented to -->
  <text x="${1600/2}" y="${c?470:380}" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#6b7280" font-style="italic">This certificate is proudly presented to</text>

  <!-- student name -->
  <text x="${1600/2}" y="${c?570:480}" text-anchor="middle" font-family="'Brush Script MT', 'Lucida Handwriting', cursive" font-size="92" fill="${i}" font-weight="700">${n(r)}</text>

  <!-- underline -->
  <line x1="${1600/2-350}" y1="${c?595:505}" x2="${1600/2+350}" y2="${c?595:505}" stroke="${i}" stroke-width="2" stroke-opacity="0.5"/>

  <!-- body -->
  ${P.map((y,h)=>`<text x="${1600/2}" y="${(c?655:565)+h*38}" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#374151">${n(y)}</text>`).join(`
  `)}

  <!-- bottom row: signature | seal | date+code -->
  <!-- Left: signature -->
  <g>
    ${u?`<image href="${n(u)}" x="${1600*.18-100}" y="851" width="200" height="80" preserveAspectRatio="xMidYMid meet"/>`:""}
    <line x1="${1600*.18-130}" y1="931" x2="${1600*.18+130}" y2="931" stroke="#374151" stroke-width="2"/>
    <text x="${1600*.18}" y="961" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1f2937" font-weight="700">${n(g)}</text>
    <text x="${1600*.18}" y="991" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#6b7280">${n(j)}</text>
  </g>

  <!-- Center: seal -->
  ${N?`<image href="${n(N)}" x="${1600/2-70}" y="861" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>`:`<g transform="translate(${1600/2} 931)">
        <circle r="62" fill="${i}" fill-opacity="0.1" stroke="${i}" stroke-width="3"/>
        <circle r="48" fill="none" stroke="${i}" stroke-width="1" stroke-dasharray="2 4"/>
        <text text-anchor="middle" y="-4" font-family="Georgia, serif" font-size="14" fill="${i}" font-weight="700">OFFICIAL</text>
        <text text-anchor="middle" y="20" font-family="Georgia, serif" font-size="14" fill="${i}" font-weight="700">SEAL</text>
      </g>`}

  <!-- Right: date + tutor + cert code -->
  <g>
    <line x1="${1600*.82-130}" y1="931" x2="${1600*.82+130}" y2="931" stroke="#374151" stroke-width="2"/>
    <text x="${1600*.82}" y="961" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1f2937" font-weight="700">${n(p)}</text>
    <text x="${1600*.82}" y="991" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#6b7280">Date Issued${v?` · Tutor: ${n(v)}`:""}</text>
  </g>

  <!-- Cert code (bottom) -->
  <text x="${1600/2}" y="1051" text-anchor="middle" font-family="'Courier New', monospace" font-size="14" fill="#9ca3af" letter-spacing="2">CERTIFICATE ID: ${n(L)}</text>
</svg>`}async function te(a,t=2){return new Promise((s,l)=>{const x=new Blob([a],{type:"image/svg+xml;charset=utf-8"}),i=URL.createObjectURL(x),d=new Image;d.crossOrigin="anonymous",d.onload=()=>{const o=document.createElement("canvas");o.width=d.naturalWidth*t,o.height=d.naturalHeight*t;const m=o.getContext("2d");if(!m){URL.revokeObjectURL(i),l(new Error("Canvas context unavailable"));return}m.fillStyle="#ffffff",m.fillRect(0,0,o.width,o.height),m.drawImage(d,0,0,o.width,o.height),URL.revokeObjectURL(i),s(o)},d.onerror=o=>{URL.revokeObjectURL(i),l(o)},d.src=i})}function M(a,t){const s=document.createElement("a");s.href=a,s.download=t,document.body.appendChild(s),s.click(),document.body.removeChild(s)}function je(){const{id:a}=O(),{isAuthenticated:t}=_(),{toast:s}=q(),[l,x]=T.useState(""),i=T.useRef(null),{data:d}=D({queryKey:["/api/courses",a],queryFn:async()=>(await fetch(`/api/courses/${a}`)).json(),enabled:!!a}),{data:o}=D({queryKey:["/api/courses",a,"progress"],queryFn:async()=>(await K("GET",`/api/courses/${a}/progress`)).json(),enabled:!!a&&t}),{data:m}=D({queryKey:["/api/certificate-template"],queryFn:async()=>(await fetch("/api/certificate-template")).json()}),r=o==null?void 0:o.certificate,b=T.useMemo(()=>!r||!m?"":ee(r,m,d),[r,m,d]),p=async f=>{if(b){x(f);try{const g=await te(b,2),j=`certificate-${r.certCode}`;if(f==="png")M(g.toDataURL("image/png"),`${j}.png`);else if(f==="jpg")M(g.toDataURL("image/jpeg",.95),`${j}.jpg`);else{const{jsPDF:L}=await Y(async()=>{const{jsPDF:n}=await import("./jspdf.es.min-BNW7lZUA.js").then(z=>z.j);return{jsPDF:n}},__vite__mapDeps([0,1,2])),c=g.toDataURL("image/jpeg",.92),u=new L({orientation:"landscape",unit:"pt",format:"a4"}),N=u.internal.pageSize.getWidth(),k=u.internal.pageSize.getHeight();u.addImage(c,"JPEG",0,0,N,k),u.save(`${j}.pdf`)}s({title:"Download started",description:`Your certificate (${f.toUpperCase()}) is on its way!`})}catch(g){s({title:"Download failed",description:g.message||"Could not export certificate",variant:"destructive"})}finally{x("")}}},v=async()=>{const f=`${window.location.origin}/certificates/${r==null?void 0:r.certCode}`;try{await navigator.clipboard.writeText(f),s({title:"Link copied!",description:"Share this verification link with anyone."})}catch{s({title:"Copy failed",variant:"destructive"})}};return t?r?e.jsxs("div",{className:"min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50",children:[e.jsx(G,{}),e.jsxs("div",{className:"pt-24 max-w-6xl mx-auto px-4 pb-16",children:[e.jsxs("div",{className:"text-center mb-8",children:[e.jsx("div",{className:"inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 text-white shadow-xl mb-4 animate-bounce",children:e.jsx(V,{className:"h-10 w-10"})}),e.jsx("h1",{className:"text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent mb-3",children:"Congratulations, you did it! 🎉"}),e.jsxs("p",{className:"text-gray-600 max-w-2xl mx-auto text-lg",children:["You've officially earned your certificate for"," ",e.jsx("span",{className:"font-semibold text-gray-900",children:r.courseTitle}),". Download it below — print it, frame it, share it. You earned it."]}),e.jsxs("div",{className:"mt-3 inline-flex items-center gap-2 text-sm text-violet-600",children:[e.jsx(B,{className:"h-4 w-4"}),e.jsxs("span",{children:["Verification ID: ",e.jsx("code",{className:"font-mono text-xs bg-violet-100 px-2 py-0.5 rounded",children:r.certCode})]})]})]}),e.jsxs("div",{className:"flex items-center justify-center gap-2 flex-wrap mb-6",children:[e.jsx(W,{href:`/breedskool/${a}/learn`,children:e.jsxs(w,{variant:"outline","data-testid":"button-back-to-learn",children:[e.jsx(Q,{className:"h-4 w-4 mr-1"})," Back to course"]})}),e.jsxs(w,{onClick:()=>p("pdf"),disabled:!!l,className:"bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white","data-testid":"button-download-pdf",children:[l==="pdf"?e.jsx(A,{className:"h-4 w-4 mr-1 animate-spin"}):e.jsx(U,{className:"h-4 w-4 mr-1"}),"Download PDF"]}),e.jsxs(w,{onClick:()=>p("png"),disabled:!!l,className:"bg-cyan-600 hover:bg-cyan-700 text-white","data-testid":"button-download-png",children:[l==="png"?e.jsx(A,{className:"h-4 w-4 mr-1 animate-spin"}):e.jsx(U,{className:"h-4 w-4 mr-1"}),"PNG"]}),e.jsxs(w,{onClick:()=>p("jpg"),disabled:!!l,className:"bg-emerald-600 hover:bg-emerald-700 text-white","data-testid":"button-download-jpg",children:[l==="jpg"?e.jsx(A,{className:"h-4 w-4 mr-1 animate-spin"}):e.jsx(U,{className:"h-4 w-4 mr-1"}),"JPG"]}),e.jsxs(w,{variant:"outline",onClick:v,"data-testid":"button-share-certificate",children:[e.jsx(J,{className:"h-4 w-4 mr-1"})," Copy share link"]})]}),e.jsx("div",{className:"bg-white rounded-2xl shadow-2xl border p-3 sm:p-6 overflow-hidden",children:e.jsx("div",{ref:i,className:"w-full",dangerouslySetInnerHTML:{__html:b},style:{maxHeight:"75vh",overflow:"auto"}})}),e.jsxs("div",{className:"mt-6 text-center text-sm text-gray-500",children:["Anyone can verify this certificate at"," ",e.jsx(W,{href:`/certificates/${r.certCode}`,children:e.jsxs("span",{className:"text-violet-600 underline",children:["/certificates/",r.certCode]})})]})]})]}):e.jsxs("div",{className:"min-h-screen bg-gray-50",children:[e.jsx(G,{}),e.jsxs("div",{className:"pt-32 max-w-lg mx-auto text-center px-4",children:[e.jsx(F,{className:"h-12 w-12 mx-auto text-amber-500 mb-4"}),e.jsx("h2",{className:"text-xl font-bold mb-2",children:"Certificate not yet available"}),e.jsxs("p",{className:"text-sm text-gray-600 mb-4",children:["Complete every lesson in this course to unlock your certificate.",o&&` (${o.completedCount}/${o.totalLessons} done)`]}),e.jsx(W,{href:`/breedskool/${a}/learn`,children:e.jsx(w,{className:"bg-violet-600 hover:bg-violet-700",children:"Continue learning"})})]})]}):e.jsxs("div",{className:"min-h-screen bg-gray-50",children:[e.jsx(G,{}),e.jsxs("div",{className:"pt-32 max-w-md mx-auto text-center px-4",children:[e.jsx(F,{className:"h-12 w-12 mx-auto text-gray-400 mb-4"}),e.jsx("p",{children:"Please sign in to view your certificate."}),e.jsx(W,{href:"/login",children:e.jsx(w,{className:"mt-3",children:"Sign in"})})]})]})}export{je as default};
