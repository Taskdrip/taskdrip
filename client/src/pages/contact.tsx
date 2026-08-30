import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SOCIALS, OFFICES } from '@/config/socials';
import { SocialLinksGrid } from '@/components/ui/social-sidebar';
import {
  Mail, Phone, MapPin, Clock, Send, Zap, MessageCircle,
  HelpCircle, CheckCircle, Building2, HeadphonesIcon
} from 'lucide-react';
import { SiTelegram, SiWhatsapp } from 'react-icons/si';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  type: z.enum(['general', 'support', 'partnership', 'bug']),
});

type ContactFormData = z.infer<typeof contactSchema>;

const faqItems = [
  {
    q: "How do I get started as a influencer?",
    a: "Sign up for a free account, complete your profile to earn 100 $TDRIP points, then join the Welcome Campaign for 130 more points. After that, browse active campaigns in /tasks and start applying.",
  },
  {
    q: "What payment methods do you support?",
    a: "We pay out in USDT on Tron (TRC-20), BNB Chain (BEP-20), and Ethereum (ERC-20). Minimum payout is $5 USDT with 24–72 hour processing by our admin team.",
  },
  {
    q: "How are task submissions verified?",
    a: "Our admin team manually reviews all task submissions for quality and authenticity before approving payments. Brands can also review submissions from their dashboard.",
  },
  {
    q: "Can brands create custom campaigns?",
    a: "Yes! Brands can create fully custom campaigns with specific requirements, budgets, content types, deadlines, and target influencer tiers through the brand dashboard.",
  },
  {
    q: "What is $TDRIP and how do I earn it?",
    a: "$TDRIP is Taskdrip's off-chain rewards system. Earn points by signing up (+50), completing your profile (+100), joining campaigns (+20), completing tasks (+50), referrals (+100), and social tasks. Points will convert to $TDRIP token at launch.",
  },
  {
    q: "How long does support take to respond?",
    a: "WhatsApp support responds within 1 hour during working hours (Mon–Fri, 9am–6pm WAT). Email and contact form responses arrive within 24 hours. Telegram community support is available around the clock.",
  },
];

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { type: 'general' },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/contact', data);
      const result = await response.json();
      toast({
        title: "Message sent!",
        description: result.message || "Thanks for reaching out. We'll get back to you within 24 hours.",
      });
      reset();
    } catch (error: any) {
      toast({
        title: "Message could not be sent",
        description: error.message || "Please try again or email support@taskdrip.online.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div
        className="relative text-white py-16 px-4 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}
      >
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <HeadphonesIcon className="h-3.5 w-3.5" /> We're here to help
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Get in Touch</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Have questions about campaigns, payments, or your account? Our team is ready to help — reach us on WhatsApp for the fastest response.
          </p>
          {/* Quick action buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg">
                <SiWhatsapp className="h-4 w-4" /> Chat on WhatsApp
              </button>
            </a>
            <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg">
                <SiTelegram className="h-4 w-4" /> Join Telegram
              </button>
            </a>
            <a href={`mailto:info@taskdrip.online`}>
              <button className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors text-sm">
                <Mail className="h-4 w-4" /> Email Support
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Send className="h-5 w-5 text-purple-600" /> Send us a Message
                </CardTitle>
                <p className="text-sm text-gray-500">Fill out the form and we'll reply within 24 hours.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                      <Input id="name" {...register('name')} placeholder="Your full name" className="mt-1" data-testid="input-name" />
                      {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                      <Input id="email" type="email" {...register('email')} placeholder="your@email.com" className="mt-1" data-testid="input-email" />
                      {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type" className="text-sm font-medium">Inquiry Type</Label>
                      <select
                        id="type"
                        {...register('type')}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        data-testid="select-type"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="partnership">Partnership / Brand Deal</option>
                        <option value="bug">Bug Report</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                      <Input id="subject" {...register('subject')} placeholder="Brief description" className="mt-1" data-testid="input-subject" />
                      {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject.message}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-medium">Message</Label>
                    <Textarea
                      id="message"
                      {...register('message')}
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      className="mt-1 resize-none"
                      data-testid="textarea-message"
                    />
                    {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="button-submit"
                    className="w-full inline-flex items-center justify-center gap-2 bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 disabled:opacity-60 transition-colors text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Message
                      </>
                    )}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contact Details */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-purple-600" /> Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <a href={`mailto:support@taskdrip.online`} className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors">support@taskdrip.online</p>
                  </div>
                </a>
                <a href="mailto:info@taskdrip.online" className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">General enquiries</p>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">info@taskdrip.online</p>
                  </div>
                </a>
                <a href="mailto:payments@taskdrip.online" className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders & payments</p>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-amber-600 transition-colors">payments@taskdrip.online</p>
                  </div>
                </a>
                <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</p>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">{SOCIALS.whatsappNumber}</p>
                  </div>
                </a>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">USA Office</p>
                    <p className="text-sm text-gray-700">{OFFICES.usa.address}</p>
                    <p className="text-sm text-gray-700">{OFFICES.usa.city}, {OFFICES.usa.country}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nigeria Office</p>
                    <p className="text-sm text-gray-700">{OFFICES.nigeria.address}</p>
                    <p className="text-sm text-gray-700">{OFFICES.nigeria.city}, {OFFICES.nigeria.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" /> Support Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600">Monday – Friday</span>
                    <span className="font-semibold text-gray-900">9:00 AM – 6:00 PM WAT</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-semibold text-gray-900">10:00 AM – 3:00 PM WAT</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-semibold text-gray-500">Closed</span>
                  </div>
                  <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2">
                      <SiWhatsapp className="h-4 w-4 text-[#25D366] flex-shrink-0" />
                      <p className="text-green-800 text-xs font-medium">
                        WhatsApp responses within 1 hour during business hours
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2">
                      <SiTelegram className="h-4 w-4 text-[#229ED9] flex-shrink-0" />
                      <p className="text-blue-800 text-xs font-medium">
                        Telegram community support available 24/7
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick points tip */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white">
              <Zap className="h-6 w-6 text-yellow-300 mb-2" />
              <p className="font-bold text-sm mb-1">Earn $TDRIP While You Wait</p>
              <p className="text-purple-100 text-xs leading-relaxed">
                While our team reviews your message, head to your dashboard and complete social tasks to earn up to 130 points instantly.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <Badge className="bg-purple-50 text-purple-700 border-0 mb-3">
              <HelpCircle className="h-3 w-3 mr-1 inline" /> FAQ
            </Badge>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Quick answers to the most common questions about Taskdrip.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {faqItems.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-purple-200 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm mb-2">{faq.q}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Find Us on Social Media</h2>
            <p className="text-gray-500">Stay connected and never miss a new campaign, update, or announcement.</p>
          </div>
          <SocialLinksGrid />
        </div>
      </div>

      <Footer />
    </div>
  );
}
