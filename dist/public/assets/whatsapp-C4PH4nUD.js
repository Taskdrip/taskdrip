import{ao as t}from"./index-CGGJ1zJW.js";const r=t.whatsapp.replace(/[^0-9]/g,"");function p(n,o=r){const e=n.filter(Boolean).join(`
`);return`https://wa.me/${o.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(e)}`}function i(n,o){const e=p(n,o);window.open(e,"_blank","noopener,noreferrer")}function c(n){return[`*Taskdrip — ${n}*`,""]}export{i as o,c as w};
