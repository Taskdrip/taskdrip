import { Navigation } from '@/components/ui/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { 
  Users, 
  Globe, 
  Smartphone, 
  DollarSign, 
  Shield, 
  Zap,
  Target,
  Award,
  TrendingUp,
  Heart,
  CheckCircle
} from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: Smartphone,
      title: "Diverse Task Categories",
      description: "From app testing to content creation, find tasks that match your skills and interests."
    },
    {
      icon: DollarSign,
      title: "Crypto Payments",
      description: "Receive payments in USDT (Tron & BSC) and TON. Fast, secure, and borderless."
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Advanced security measures protect your data and earnings."
    },
    {
      icon: Globe,
      title: "Global Community",
      description: "Connect with brands and creators from around the world."
    },
    {
      icon: Zap,
      title: "Instant Verification",
      description: "Quick task approval process to get you paid faster."
    },
    {
      icon: Award,
      title: "Reputation System",
      description: "Build your reputation and unlock higher-paying opportunities."
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Creators" },
    { number: "1,000+", label: "Brands Connected" },
    { number: "$2M+", label: "Total Earnings Paid" },
    { number: "25+", label: "Countries Served" }
  ];

  const taskCategories = [
    { name: "App Testing", description: "Test mobile apps and provide feedback", color: "bg-blue-500" },
    { name: "Content Creation", description: "Create posts, videos, and articles", color: "bg-purple-500" },
    { name: "Social Media", description: "Engage with social media campaigns", color: "bg-pink-500" },
    { name: "Trading Tasks", description: "Participate in trading challenges", color: "bg-green-500" },
    { name: "Local Errands", description: "Complete location-based tasks", color: "bg-orange-500" },
    { name: "Event Hosting", description: "Host virtual or local events", color: "bg-red-500" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-black to-gray-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              About Breedskool
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              The leading Web3 SocialFi platform connecting creators with brands through 
              diverse task-based campaigns and crypto reward systems.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                  Join as Creator
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-black mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-6">
                We're revolutionizing the creator economy by building a decentralized platform 
                where talent meets opportunity. Our mission is to empower creators worldwide 
                with fair compensation, transparent processes, and blockchain-based payments.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Decentralized and transparent</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Fair compensation for all</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Global accessibility</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Community-driven growth</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white">
              <Target className="h-12 w-12 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Why Breedskool?</h3>
              <p className="text-blue-100 mb-6">
                We believe in the power of human creativity and the importance of fair compensation. 
                Our platform combines cutting-edge blockchain technology with user-friendly design.
              </p>
              <div className="flex items-center text-blue-100">
                <Heart className="h-5 w-5 mr-2" />
                <span>Built by creators, for creators</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-xl text-gray-600">
              Everything you need to succeed in the creator economy
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="h-12 w-12 mx-auto text-black mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Task Categories */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Task Categories</h2>
            <p className="text-xl text-gray-600">
              Diverse opportunities for every skill set
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taskCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-4 h-4 rounded-full ${category.color} mr-3`}></div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  </div>
                  <p className="text-gray-600 text-sm">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-black to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Earning?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who are already earning crypto rewards through Breedskool
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                Get Started Today
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                Browse Tasks
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}