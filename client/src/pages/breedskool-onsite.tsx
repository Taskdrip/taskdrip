import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin, Clock, Users, Phone, Calendar, ChevronRight,
  BookOpen, Wifi, Home, GraduationCap, Star, CheckCircle2,
} from "lucide-react";

const SCHEDULE = [
  { day: "Monday – Wednesday", time: "10am – 1pm", program: "Web3 & DeFi Fundamentals", slots: 12 },
  { day: "Tuesday – Thursday", time: "2pm – 5pm", program: "Social Media Monetisation", slots: 8 },
  { day: "Saturday", time: "9am – 3pm", program: "Full-Day Creator Bootcamp", slots: 20 },
  { day: "Sunday", time: "10am – 12pm", program: "Intro to Crypto & NFTs", slots: 15 },
];

const FEATURES = [
  "Hands-on practical sessions with real equipment",
  "Small class sizes — max 20 students per session",
  "Direct mentorship from certified instructors",
  "Course completion certificate issued on-site",
  "Networking with fellow creators & entrepreneurs",
  "Access to BreedSkool online platform after class",
];

export default function BreedSkoolOnsite() {
  const [, navigate] = useLocation();

  const { data: pricing = [] } = useQuery<any[]>({
    queryKey: ["/api/breedskool/pricing"],
  });

  const onsitePricing = pricing.find((p: any) =>
    p.courseKey === "onsite_training" || p.label?.toLowerCase().includes("onsite") || p.deliveryMode === "onsite"
  );

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 60%), radial-gradient(circle at 80% 30%, #4f46e5 0%, transparent 50%)" }} />
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <Badge className="bg-yellow-400 text-yellow-900 mb-4 text-xs font-bold px-3 py-1">🏫 Onsite Classes</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Learn In-Person at<br />
            <span className="text-yellow-400">BreedSkool Lagos</span>
          </h1>
          <p className="text-white/80 text-lg max-w-xl mb-8">
            Join our physical training centre for hands-on tech education, live mentorship, and real-world skills that pay.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold gap-2 shadow-lg"
              onClick={() => navigate("/breedskool?mode=onsite")}
              data-testid="button-register-onsite-hero"
            >
              <GraduationCap className="h-5 w-5" /> Register for Onsite Training
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 gap-2"
              onClick={() => navigate("/breedskool")}
            >
              <Wifi className="h-4 w-4" /> View Online Options
            </Button>
          </div>
        </div>
      </div>

      {/* Venue Info */}
      <div className="bg-violet-50 border-b border-violet-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="h-4 w-4 text-violet-600 flex-shrink-0" />
            <div>
              <span className="font-semibold">Training Venue:</span> TootoOba Estate, Ijede, Ikorodu, Lagos
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="h-4 w-4 text-violet-600" />
            <a href="https://wa.me/2348000000000" className="hover:text-violet-700 hover:underline">WhatsApp us for directions</a>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Users className="h-4 w-4 text-violet-600" />
            <span>Small class sizes — max 20 per session</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">

        {/* Pricing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Onsite Training Fees</h2>
          <p className="text-gray-500 mb-8">One-time fees in Naira. Includes all materials and your certificate.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {onsitePricing ? (
              <Card className="border-violet-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{onsitePricing.label || "Onsite Training"}</h3>
                      <p className="text-sm text-gray-500">{onsitePricing.description || "Full programme access"}</p>
                    </div>
                    <Badge className="bg-violet-100 text-violet-700">Physical</Badge>
                  </div>
                  <div className="text-3xl font-extrabold text-violet-700 mb-4">
                    ₦{Number(onsitePricing.price || 0).toLocaleString()}
                  </div>
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => navigate("/breedskool?mode=onsite")}
                    data-testid="button-register-onsite-pricing"
                  >
                    Register Now <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-violet-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Standard Programme</h3>
                    <p className="text-sm text-gray-500 mb-3">4-week intensive training, 3× per week</p>
                    <div className="text-3xl font-extrabold text-violet-700 mb-4">₦35,000</div>
                    <Button
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => navigate("/breedskool?mode=onsite")}
                      data-testid="button-register-onsite-standard"
                    >
                      Register Now <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Weekend Bootcamp</h3>
                    <p className="text-sm text-gray-500 mb-3">Intensive Saturday sessions for 6 weeks</p>
                    <div className="text-3xl font-extrabold text-yellow-700 mb-4">₦25,000</div>
                    <Button
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-white"
                      onClick={() => navigate("/breedskool?mode=onsite")}
                      data-testid="button-register-onsite-weekend"
                    >
                      Register Now <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </section>

        {/* Class Schedule */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Class Schedule</h2>
          <p className="text-gray-500 mb-8">Flexible schedules to fit around your work or school day.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SCHEDULE.map((s, i) => (
              <div key={i} className="border rounded-xl p-4 flex gap-4 items-start hover:border-violet-200 hover:bg-violet-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.program}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" /> {s.day} · {s.time}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                    <Users className="h-3 w-3" /> {s.slots} spots available
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What you get */}
        <section className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Included</h2>
            <ul className="space-y-3">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Physical + Online Access</p>
                <p className="text-xs text-gray-500">Attend in-person and revisit lessons anytime online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Certified Instructors</p>
                <p className="text-xs text-gray-500">Industry professionals with years of experience</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Home className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Home Tutor Available</p>
                <p className="text-xs text-gray-500">Can't come to us? We'll send a tutor to you</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-violet-700 to-purple-700 rounded-3xl p-10 text-center text-white">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-2">Ready to Start Learning In-Person?</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Secure your spot today. Classes fill up fast — limited to 20 students per session.
          </p>
          <Button
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold gap-2"
            onClick={() => navigate("/breedskool?mode=onsite")}
            data-testid="button-register-onsite-cta"
          >
            <GraduationCap className="h-5 w-5" /> Register for Onsite Training
          </Button>
        </section>

      </div>

      <Footer />
    </div>
  );
}
