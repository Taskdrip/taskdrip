import { useState } from "react";
import type { ReactNode } from "react";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { SeoHead } from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Egg,
  Factory,
  Lightbulb,
  MapPin,
  PackageCheck,
  PlugZap,
  ShieldAlert,
  Sprout,
  Thermometer,
  TimerReset,
  Wallet,
} from "lucide-react";

const OFFER_URL = "https://s.click.aliexpress.com/e/_c31tJgUb";

const gallery = [
  {
    src: "/images/products/egg-incubator/shipping-and-cabinet.webp",
    alt: "Seller listing photo showing the incubator cabinet and shipping package",
    caption: "Cabinet and shipping presentation",
  },
  {
    src: "/images/products/egg-incubator/farm-setting.webp",
    alt: "Seller listing photo of an incubator shown in a farm setting",
    caption: "Shown in a farm setting",
  },
  {
    src: "/images/products/egg-incubator/tray-rack.webp",
    alt: "Seller listing photo showing the incubator's tray rack arrangement",
    caption: "Tray and rack view",
  },
  {
    src: "/images/products/egg-incubator/chicks-example.webp",
    alt: "Seller listing example image with chicks; not a verified result from this machine",
    caption: "Seller example image — not a verified hatch result",
  },
  {
    src: "/images/products/egg-incubator/hatch-basket-example.webp",
    alt: "Seller listing example image of a hatch basket; results are not independently verified",
    caption: "Seller example image — outcomes vary",
  },
];

const launchSteps = [
  {
    number: "01",
    title: "Find buyers before buying eggs",
    body: "Talk with nearby households, farms, feed shops and poultry groups. Ask which breeds and quantities they need, when they need them, and what they currently pay. For contract hatching, agree who supplies fertile eggs and what happens to clears or unhatched eggs.",
    icon: Sprout,
  },
  {
    number: "02",
    title: "Build a real batch budget",
    body: "Price fertile eggs, transport, electricity or backup power, cleaning supplies, packaging, labour, delivery and expected losses. Compare that full cost with the price buyers will actually pay. Do not build a plan around the seller's hatch-rate claim.",
    icon: Wallet,
  },
  {
    number: "03",
    title: "Confirm the machine will fit your operation",
    body: "Ask the seller to confirm species-specific trays and usable capacity, local voltage and frequency, the exact dual-power arrangement, dimensions, package size, shipping terms and warranty coverage in writing.",
    icon: ClipboardCheck,
  },
  {
    number: "04",
    title: "Prepare the room and power",
    body: "Choose a clean, stable room away from drafts, direct sun, dust and heavy traffic. Plan dependable electricity and a tested backup arrangement appropriate to the machine; the seller's phrase “dual power supply” does not explain how backup works.",
    icon: PlugZap,
  },
  {
    number: "05",
    title: "Learn, then test before loading",
    body: "Read the manufacturer's instructions and follow local poultry or veterinary guidance. Run the incubator empty to understand its controls, turning cycle, readings and alarms, and check that conditions remain stable before committing valuable eggs.",
    icon: Thermometer,
  },
  {
    number: "06",
    title: "Pilot, record, and decide whether to scale",
    body: "Start with a manageable batch, not the full stated capacity. Record egg source and storage, dates, settings, power interruptions, clears, hatch-outs, mortality and every cost. Review the results and customer terms before increasing batch size.",
    icon: TimerReset,
  },
];

const dueDiligence = [
  ["Capacity and species", "Is 528 the chicken-egg capacity only? Which trays are supplied, and what are the usable capacity and tray fit for your chosen species and egg size?"],
  ["Power", "What does dual power mean in practice? Which backup source, changeover method and runtime are supported? Confirm voltage and frequency for your location."],
  ["Shipping and package", "Confirm delivered cost, dispatch estimate, destination coverage, customs or import costs, package dimensions, and how the unit is protected in transit."],
  ["Dimensions and weight", "The listing gives 53.5 × 53 × 58 cm; confirm whether that is the machine or package. Seller weight is shown as “59” with no unit; ask for the unit and shipping weight."],
  ["Warranty and returns", "The listing states a one-year warranty. Get the coverage, exclusions, service process, return address and responsibility for return shipping in writing."],
  ["Instructions and support", "Ask for the current manual, operating guidance, spare-parts availability and a clear contact route if controls, turning or power functions fail."],
];

function OfferButton({ className = "" }: { className?: string }) {
  return (
    <Button
      asChild
      className={`h-auto min-h-12 rounded-full bg-[#b85d3e] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(120,60,38,0.16)] transition-transform hover:-translate-y-0.5 hover:bg-[#a44d33] ${className}`}
    >
      <a href={OFFER_URL} target="_blank" rel="nofollow sponsored noopener noreferrer">
        See current AliExpress offer
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </Button>
  );
}

function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b563b]">
      <span className="h-px w-7 bg-[#b86a4b]" aria-hidden="true" />
      {children}
    </p>
  );
}

export default function EggIncubatorListing() {
  const [activeImage, setActiveImage] = useState(0);
  const selectedImage = gallery[activeImage];

  const showImage = (index: number) => {
    setActiveImage((index + gallery.length) % gallery.length);
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#f5f1e8] text-[#24352e]">
      <SeoHead
        title="528 Chicken Egg Incubator: Practical Buying Guide | Taskdrip Shop"
        description="A grounded buying guide to the seller-listed 528-egg automatic incubator: stated features, business uses, a beginner launch path and questions to ask before ordering."
        keywords="528 egg incubator, chicken incubator buying guide, poultry hatchery business, automatic egg incubator"
        ogTitle="Could a 528-egg incubator fit your farm?"
        ogDescription="Review the seller-listed details, practical business uses and checks to make before ordering."
        ogImage={gallery[0].src}
        ogType="product"
      />
      <NavigationFixed />

      <main>
        <section className="relative border-b border-[#d9d2c3] bg-[#f5f1e8]">
          <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full border border-[#d8c8ad]/60" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-8 top-32 h-52 w-52 rounded-full border border-[#d8c8ad]/50" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-5 pb-14 pt-8 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24 lg:pt-12">
            <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-[#718077]">
              <a href="/shop" className="transition-colors hover:text-[#a65135]">Taskdrip Shop</a>
              <span aria-hidden="true">/</span>
              <span className="text-[#31463b]">Poultry equipment</span>
              <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-[#d8cdbb] bg-[#fbf8f1] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#66756a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b66a4b]" />
                Practical buying guide
              </span>
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div className="relative z-10">
                <SectionKicker>Equipment for a working hatchery</SectionKicker>
                <h1 className="max-w-2xl font-serif text-[clamp(2.7rem,6.2vw,5.4rem)] leading-[0.98] tracking-[-0.045em] text-[#24382e]">
                  528-Egg Fully Automatic
                  <span className="block italic text-[#a85438]">Incubator for Farms</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-[#5e6b60] sm:text-lg sm:leading-8">
                  The 528 Chicken Egg Incubator is listed as a fully automatic unit for planned batch production. Here is what the seller says, what it could make easier, and what to verify before it becomes part of your farm.
                </p>
                <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <OfferButton />
                  <a
                    href="#business-fit"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#c9bda9] bg-[#fbf8f1] px-5 py-3 text-sm font-bold text-[#31463b] transition-colors hover:border-[#a85438] hover:text-[#a85438]"
                  >
                    Explore the business case
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <p className="mt-3 max-w-lg text-xs leading-5 text-[#778176]">
                  Taskdrip may earn a commission if you purchase through this affiliate link. No price or hatch outcome is assumed here.
                </p>
                <div className="mt-10 grid max-w-lg grid-cols-3 border-y border-[#d8d0c2] py-4">
                  <div className="pr-3">
                    <p className="font-serif text-2xl text-[#a85438]">528</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#68756b]">Stated chicken-egg capacity</p>
                  </div>
                  <div className="border-l border-[#d8d0c2] px-4">
                    <p className="font-serif text-2xl text-[#a85438]">Auto</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#68756b]">Turning listed</p>
                  </div>
                  <div className="border-l border-[#d8d0c2] pl-4">
                    <p className="font-serif text-2xl text-[#a85438]">220V</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#68756b]">Confirm local compatibility</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-3 rotate-2 rounded-[2rem] border border-[#d8c8ad] bg-[#e9e0cf]" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-[1.6rem] border-[5px] border-[#fbf8f1] bg-[#ddd5c6] shadow-[0_22px_60px_rgba(53,61,48,0.17)]">
                  <div className="relative aspect-[4/3]">
                    <img
                      key={selectedImage.src}
                      src={selectedImage.src}
                      alt={selectedImage.alt}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#16251e]/80 via-[#16251e]/20 to-transparent p-5 pt-16 text-white sm:p-6 sm:pt-20">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Seller listing image</p>
                        <p className="mt-1 max-w-sm text-sm font-semibold leading-5">{selectedImage.caption}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => showImage(activeImage - 1)}
                          aria-label="View previous product photo"
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-[#24382e]/50 text-white transition-colors hover:bg-white hover:text-[#24382e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => showImage(activeImage + 1)}
                          aria-label="View next product photo"
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-[#24382e]/50 text-white transition-colors hover:bg-white hover:text-[#24382e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-5 gap-2 sm:gap-3">
                  {gallery.map((image, index) => (
                    <button
                      key={image.src}
                      type="button"
                      onClick={() => showImage(index)}
                      aria-label={`Show photo ${index + 1}: ${image.caption}`}
                      aria-pressed={activeImage === index}
                      className={`group aspect-square overflow-hidden rounded-xl border-2 bg-[#e5ddce] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a85438] ${
                        activeImage === index ? "border-[#a85438] ring-2 ring-[#a85438]/20" : "border-[#fbf8f1] hover:border-[#c58b72]"
                      }`}
                    >
                      <img src={image.src} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-right text-[10px] leading-4 text-[#7c8277]">
                  Photos and examples are from the seller listing; pictured chicks and outcomes are not verified product results.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#263c32] text-[#f8f3e8]">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-12">
            <div className="flex items-start gap-4 border-b border-white/15 pb-5 sm:border-b-0 sm:border-r sm:pb-0">
              <div className="rounded-xl bg-[#f1e5cf]/10 p-3 text-[#e5b08f]"><Egg className="h-5 w-5" /></div>
              <div><p className="font-serif text-xl">Batch planning</p><p className="mt-1 max-w-xs text-sm leading-5 text-white/65">A stated capacity to compare with real buyer demand.</p></div>
            </div>
            <div className="flex items-start gap-4 border-b border-white/15 pb-5 sm:border-b-0 sm:border-r sm:pb-0 sm:pl-5">
              <div className="rounded-xl bg-[#f1e5cf]/10 p-3 text-[#e5b08f]"><TimerReset className="h-5 w-5" /></div>
              <div><p className="font-serif text-xl">Less repetitive turning</p><p className="mt-1 max-w-xs text-sm leading-5 text-white/65">Automatic turning can reduce routine manual work; monitoring still matters.</p></div>
            </div>
            <div className="flex items-start gap-4 sm:pl-5">
              <div className="rounded-xl bg-[#f1e5cf]/10 p-3 text-[#e5b08f]"><ShieldAlert className="h-5 w-5" /></div>
              <div><p className="font-serif text-xl">Check before you commit</p><p className="mt-1 max-w-xs text-sm leading-5 text-white/65">Verify power, trays, delivery and warranty directly with the seller.</p></div>
            </div>
          </div>
        </section>

        <section id="business-fit" className="scroll-mt-20 bg-[#fbf8f1] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
              <div>
                <SectionKicker>Where the value may be</SectionKicker>
                <h2 className="max-w-md font-serif text-4xl leading-[1.05] tracking-[-0.035em] text-[#263c32] sm:text-5xl">
                  Useful capacity is capacity you can sell.
                </h2>
                <p className="mt-5 max-w-md text-sm leading-7 text-[#667268]">
                  Automation is a work-saving feature, not a business plan. A larger batch only helps when fertile eggs, buyers, power and post-hatch care are in place.
                </p>
                <div className="mt-8 rounded-2xl border border-[#ded4c3] bg-[#f4efe4] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9b563b]">A practical distinction</p>
                  <p className="mt-2 font-serif text-xl leading-snug text-[#31463b]">Automation can reduce routine. It does not remove responsibility.</p>
                  <p className="mt-2 text-xs leading-5 text-[#69756a]">Egg quality, suitable setup, power continuity, hygiene and daily observation remain operator work.</p>
                </div>
              </div>

              <div className="space-y-0">
                {[
                  {
                    n: "01",
                    title: "Sell day-old chicks",
                    text: "Source suitable fertile eggs, plan batches around local demand and arrange collection or delivery windows before hatch. Communicate clearly about breed, age, quantities and availability.",
                    icon: Egg,
                  },
                  {
                    n: "02",
                    title: "Offer contract hatching",
                    text: "Customers may provide eggs and pay for incubation service. Agree intake criteria, batch identification, timing, fees, handling of infertile or unhatched eggs and responsibility for collection in writing.",
                    icon: Factory,
                  },
                  {
                    n: "03",
                    title: "Consider brooding or pullet sales later",
                    text: "This adds time, feed, space, health management and local compliance needs. Expand only if you have the skills, suitable housing and a clear market for older birds.",
                    icon: Sprout,
                  },
                ].map((path) => (
                  <article key={path.n} className="group grid grid-cols-[3rem_1fr] gap-4 border-t border-[#ded8cb] py-6 sm:grid-cols-[4rem_1fr] sm:gap-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d6c8b4] font-mono text-xs text-[#a85438] transition-colors group-hover:bg-[#a85438] group-hover:text-white">
                      {path.n}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <path.icon className="h-4 w-4 text-[#a85438]" aria-hidden="true" />
                        <h3 className="font-serif text-2xl text-[#2b4035]">{path.title}</h3>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68746a]">{path.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eee7d9] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <SectionKicker>Start small. Learn the cycle.</SectionKicker>
                <h2 className="font-serif text-4xl leading-[1.05] tracking-[-0.035em] text-[#263c32] sm:text-5xl">A careful first-batch path</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#68746a]">The goal is not to fill every tray. It is to learn your costs, process and local demand before you scale.</p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-[#d8cebc] bg-[#d8cebc] md:grid-cols-2 xl:grid-cols-3">
              {launchSteps.map((step) => (
                <article key={step.number} className="relative min-h-[238px] bg-[#f8f4eb] p-6 sm:p-8">
                  <div className="mb-7 flex items-center justify-between">
                    <span className="font-mono text-xs tracking-[0.18em] text-[#a85438]">{step.number} / 06</span>
                    <step.icon className="h-5 w-5 text-[#a85438]" aria-hidden="true" />
                  </div>
                  <h3 className="max-w-xs font-serif text-2xl leading-tight text-[#2d4337]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#68746a]">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#fbf8f1] py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:px-12">
            <div>
              <SectionKicker>Seller-listed details</SectionKicker>
              <h2 className="font-serif text-4xl leading-[1.05] tracking-[-0.035em] text-[#263c32] sm:text-5xl">Facts to read with care.</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#68746a]">
                These are details reported in the seller listing, not independently tested or verified by Taskdrip. Confirm the exact unit and terms before ordering.
              </p>
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#e1c7b7] bg-[#f9eee6] p-4">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#a85438]" />
                <p className="text-xs leading-5 text-[#6b5c50]"><strong className="text-[#473d34]">About “98% hatch rate”:</strong> this is an unverified seller claim, not a guarantee. Fertility, egg storage and quality, setup, species and operator practice all affect results.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#ded6c8]">
              <div className="grid grid-cols-[minmax(112px,0.58fr)_1fr] border-b border-[#ded6c8] bg-[#eee7d9] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#798075] sm:px-6">
                <span>Listing detail</span><span>Seller-listed information and what to check</span>
              </div>
              {[
                ["Product", "528 Chicken Egg Incubator; listed as new."],
                ["Operation", "Fully automatic digital incubator with automatic egg turning and digital controls."],
                ["Ease of use", "The seller lists “easy to operate” as a key selling point. Ask for the current manual and confirm what still needs daily monitoring."],
                ["Stated capacity", "528 chicken eggs. Capacity for other species depends on egg size and tray fit; confirm the exact trays and usable capacity."],
                ["Construction", "Color-steel construction; described in the listing as a small-sized incubator."],
                ["Power", "220V and dual power supply are listed. Local voltage/frequency compatibility and the exact backup arrangement are unspecified; confirm with seller."],
                ["Species listed", "Chicken, pigeon, quail, duck, goose, turkey, emu and ostrich. Do not assume one tray or capacity works for every species."],
                ["Dimensions", "53.5 × 53 × 58 cm are listed. Verify whether these are machine dimensions or package dimensions."],
                ["Origin and package", "Origin listed as Jiangxi, China; package listed as wooden box/carton. Confirm shipping details for your destination."],
                ["Weight", "Seller shows “59” without a unit. Ask for the unit weight and packed shipping weight before ordering."],
                ["Warranty", "One year is listed. Confirm what is covered, exclusions, service process and who pays return shipping."],
              ].map(([label, detail], i) => (
                <div key={label} className={`grid grid-cols-[minmax(112px,0.58fr)_1fr] gap-3 px-4 py-4 sm:gap-6 sm:px-6 ${i < 10 ? "border-b border-[#e8e1d6]" : ""}`}>
                  <p className="text-xs font-bold text-[#344b3e]">{label}</p>
                  <p className="text-xs leading-5 text-[#69746b]">{detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <OfferButton />
              <p className="max-w-sm text-xs leading-5 text-[#788075]">
                This affiliate link may earn Taskdrip a commission. Confirm the current price and seller terms before ordering.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#263c32] py-20 text-[#f8f3e8] sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
              <div>
                <SectionKicker>Before you order</SectionKicker>
                <h2 className="font-serif text-4xl leading-[1.05] tracking-[-0.035em] sm:text-5xl">Get clear answers first.</h2>
                <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
                  Ask these questions in the seller chat and keep the answers. A listing detail is not a substitute for confirmed terms.
                </p>
                <div className="mt-8 flex items-center gap-3 text-xs text-white/50">
                  <MapPin className="h-4 w-4 text-[#e0a487]" />
                  Local rules and veterinary guidance vary by location.
                </div>
              </div>
              <div className="divide-y divide-white/15 border-y border-white/15">
                {dueDiligence.map(([topic, question], index) => (
                  <details key={topic} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e0a487]">
                      <span className="w-7 shrink-0 font-mono text-[10px] text-[#e0a487]">0{index + 1}</span>
                      <span className="flex-1 font-serif text-xl">{topic}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/60 transition-transform group-open:rotate-45">
                        <span className="text-lg leading-none" aria-hidden="true">+</span>
                      </span>
                    </summary>
                    <p className="pb-5 pl-11 pr-10 text-sm leading-6 text-white/65">{question}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f2ebdd] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
              <div>
                <SectionKicker>Buying responsibly</SectionKicker>
                <h2 className="max-w-2xl font-serif text-4xl leading-[1.05] tracking-[-0.035em] text-[#263c32] sm:text-5xl">
                  Your operation is the investment. Start with the numbers.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#68746a]">
                  Estimate the full delivered cost, test your local buyer demand and map your post-hatch plan. No income is promised, and no universal incubation settings are offered here; use the machine instructions and local poultry or veterinary guidance.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#d8cdbb] bg-[#fbf8f1] p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#a85438]" />
                  <div>
                    <h3 className="font-serif text-2xl text-[#2d4337]">Before the first batch</h3>
                    <ul className="mt-5 space-y-3 text-sm leading-5 text-[#657167]">
                      {[
                        "Clean, stable room and reliable power plan",
                        "Suitable fertile eggs and manageable pilot size",
                        "Brooding space, feed and health-care plan",
                        "Clear buyer terms, collection timing and records",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8b694b]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="offer" className="scroll-mt-16 bg-[#b85d3e]">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-12 sm:px-8 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Seller marketplace listing</p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">Check the current offer and confirm the details.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                Seller handles price, stock, shipping, returns and warranty. Check the live listing and ask questions before ordering.
              </p>
            </div>
            <div className="shrink-0">
              <OfferButton className="bg-[#f8f3e8] text-[#7d3d2b] shadow-none hover:bg-white hover:text-[#7d3d2b]" />
            </div>
          </div>
        </section>

        <section className="bg-[#fbf8f1] py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-[11px] leading-5 text-[#788075] sm:px-8 lg:flex-row lg:items-start lg:justify-between lg:px-12">
            <p className="max-w-3xl">
              <strong className="text-[#4c5e51]">Affiliate disclosure:</strong> Taskdrip may earn a commission if you purchase through this link. The seller sets the price and purchase terms. This page is an informational buying guide, not an independent product test or seller endorsement.
            </p>
            <p className="max-w-sm lg:text-right">Product claims and terms are seller-submitted and may change. Confirm all details with the seller.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
