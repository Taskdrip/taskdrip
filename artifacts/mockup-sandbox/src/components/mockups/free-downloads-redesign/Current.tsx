import "./_group.css";
import { ArrowRight, ArrowUpRight, Download, Search, ShieldCheck } from "lucide-react";

const categories = [
  { name: "AI Tools", count: "42", description: "Helpful tools for everyday work" },
  { name: "Software", count: "28", description: "Useful apps and utilities" },
  { name: "Templates", count: "36", description: "Ready-to-use creative assets" },
  { name: "Education", count: "19", description: "Guides and learning material" },
];

const resources = [
  { title: "Creator Starter Toolkit", category: "Templates", format: "ZIP", image: "/__mockup/images/free-downloads-hero-creator.jpg", count: "1,284", description: "A practical collection of planning sheets and creative assets." },
  { title: "AI Writing Assistant Guide", category: "AI Tools", format: "PDF", image: "/__mockup/images/free-downloads-hero-tools.jpg", count: "876", description: "A concise guide to choosing tools for your writing workflow." },
  { title: "Digital Learning Planner", category: "Education", format: "PDF", image: "/__mockup/images/free-downloads-hero-learning.jpg", count: "642", description: "Plan lessons, projects and focused study sessions." },
];

export function Current() {
  return <main className="fd-page">
    <header className="fd-site-header">
      <a className="fd-brand" href="#"><span className="fd-mark">TD</span><span>Taskdrip</span></a>
      <nav className="fd-site-nav"><a href="#">Home</a><a href="#">Free Downloads</a><a href="#fd-categories">Categories⌄</a><a href="#">Request a Download</a></nav>
      <div className="fd-header-account"><a href="#">Log in</a><a className="fd-account-primary" href="#">Register</a></div>
    </header>
    <div className="fd-topline"><span className="fd-mark">TD</span><span>Taskdrip / Resource Library</span><span className="fd-topline-right"><ShieldCheck size={14} /> Permission-led resources</span></div>
    <div className="fd-container">
      <section className="fd-hero">
        <div>
          <div className="fd-eyebrow"><span />THE TASKDRIP RESOURCE LIBRARY</div>
          <h1>Everything You Need, All in One Place.</h1>
          <p className="fd-hero-copy">Discover free software, AI tools, entertainment, educational resources and digital downloads.</p>
          <div className="fd-search-wrap"><Search size={19} /><input aria-label="Search resources" placeholder="Search resources, tools and more" /></div>
          <div className="fd-hero-actions"><a className="fd-button" href="#fd-library">Explore downloads <ArrowRight size={15} /></a><a className="fd-button fd-button-outline" href="#fd-categories">Browse categories</a></div>
        </div>
        <aside className="fd-hero-note has-image" style={{ backgroundImage: "linear-gradient(0deg,rgba(31,26,45,.78),rgba(31,26,45,.06)),url('/__mockup/images/free-downloads-hero-creator.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="fd-note-index">01 / OPEN LIBRARY</div>
          <div className="fd-note-copy"><strong>Curated, not crowded.</strong><span>Browse by format, topic or the people who shared it.</span></div>
        </aside>
      </section>
      <nav id="fd-categories" className="fd-category-rail" aria-label="Browse resource categories">{categories.map(item => <a className="fd-category-chip" href="#" key={item.name}>{item.name}<span>{item.count}</span></a>)}</nav>
      <section className="fd-section fd-category-explorer">
        <div className="fd-section-title"><div><span className="fd-kicker">BROWSE THE LIBRARY</span><h2>Explore by category</h2><p>Find documents, tools, software, audio, video and learning resources.</p></div></div>
        <div className="fd-category-grid">{categories.map(item => <a className="fd-category-card" href="#" key={item.name}><div className="fd-category-card-mark">{item.name[0]}</div><div><strong>{item.name}</strong><span>{item.description}</span><small>{item.count} resources</small></div><ArrowRight size={15} /></a>)}</div>
      </section>
      <section className="fd-section" id="fd-library">
        <div className="fd-section-title"><div><span className="fd-kicker">THE LIBRARY</span><h2>Find your next useful thing</h2><p>Browse the full collection, with the newest additions first.</p></div></div>
        <div className="fd-toolbar"><select className="fd-select" aria-label="Sort resources"><option>Recently added</option><option>Most downloaded</option></select></div>
        <div className="fd-resource-grid">{resources.map(item => <article className="fd-resource-card" key={item.title}><div className="fd-card-art"><img src={item.image} alt="" /><span className="fd-card-format">{item.format}</span></div><div className="fd-card-content"><div className="fd-card-meta"><a className="fd-category-link" href="#">{item.category}</a></div><h3>{item.title}</h3><p>{item.description}</p><div className="fd-card-foot"><span>Taskdrip library</span><span className="fd-count"><Download size={13} />{item.count}</span></div><a className="fd-card-detail-link" href="#">View details <ArrowUpRight size={13} /></a></div></article>)}</div>
      </section>
    </div>
    <footer className="fd-footer"><span>Useful things, shared with permission.</span><a href="#">Suggest a resource <ArrowUpRight size={14} /></a></footer>
  </main>;
}
