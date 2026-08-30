import{an as t}from"./index-y43YBgki.js";const r=t.whatsapp.replace(/[^0-9]/g,"");function p(n,e=r){const o=n.filter(Boolean).join(`
`);return`https://wa.me/${e.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(o)}`}function i(n,e){const o=p(n,e);window.open(o,"_blank","noopener,noreferrer")}function c(n){return[`*Taskdrip — ${n}*`,""]}export{i as o,c as w};
