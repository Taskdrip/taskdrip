import{ap as t}from"./index-BhGjqPko.js";const p=t.whatsapp.replace(/[^0-9]/g,"");function r(n,e=p){const o=n.filter(Boolean).join(`
`);return`https://wa.me/${e.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(o)}`}function i(n,e){const o=r(n,e);window.open(o,"_blank","noopener,noreferrer")}function c(n){return[`*Taskdrip — ${n}*`,""]}export{i as o,c as w};
