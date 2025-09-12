import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { 
  Camera, 
  BarChart3, 
  Wallet, 
  FileSpreadsheet, 
  TrendingUp, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Quote,
  Twitter,
  Linkedin,
  Github,
  Mail,
  Phone,
  MapPin,
  Crown,
  Users,
  Award,
  Target,
  Brain,
  Database,
  RefreshCw,
  DollarSign,
  PieChart,
  LineChart,
  Upload
} from "lucide-react";

export default function Landing() {
  useEffect(() => {
    // Set page title and meta description for SEO
    document.title = "BetSnap - AI-Powered Sports Betting Tracker | Capture, Analyze, Win";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Track your sports bets with AI-powered slip extraction, advanced analytics, and Google Sheets integration. Join 15k+ users maximizing their betting performance.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Track your sports bets with AI-powered slip extraction, advanced analytics, and Google Sheets integration. Join 15k+ users maximizing their betting performance.';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2" data-testid="logo">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">BetSnap</span>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex items-center space-x-6">
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
                  Features
                </a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">
                  Pricing
                </a>
                <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-reviews">
                  Reviews
                </a>
              </nav>
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" data-testid="button-login">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button data-testid="button-get-started">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-background via-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20">
              <Zap className="h-4 w-4 mr-2" />
              AI-Powered Betting Analytics
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Transform Your Sports Betting with 
              <span className="text-primary"> Smart Analytics</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track, analyze, and optimize your sports betting performance with AI-powered slip extraction, 
              advanced analytics, and professional bankroll management tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8" data-testid="button-hero-start">
                  <Camera className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-hero-demo">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </Link>
            </div>
            
            {/* Hero Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
              <div>
                <div className="text-2xl font-bold text-primary">99.2%</div>
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">15k+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">$2.3M</div>
                <div className="text-sm text-muted-foreground">Tracked Volume</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Win</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools designed for serious sports bettors who want to track, 
              analyze, and improve their betting performance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI-Powered Slip Extraction */}
            <Card className="group hover:shadow-xl transition-all duration-300" data-testid="feature-ai-extraction">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI-Powered Slip Extraction</CardTitle>
                <CardDescription>
                  Upload betting slips and let our AI instantly extract all bet details with 99.2% accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Instant image recognition
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Support for 50+ sportsbooks
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Multi-language support
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Analytics */}
            <Card className="group hover:shadow-xl transition-all duration-300" data-testid="feature-analytics">
              <CardHeader>
                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Deep insights into your betting performance with professional-grade analytics and reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    ROI & Profit tracking
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Performance by sport/market
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Win rate optimization
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bankroll Management */}
            <Card className="group hover:shadow-xl transition-all duration-300" data-testid="feature-bankroll">
              <CardHeader>
                <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Smart Bankroll Management</CardTitle>
                <CardDescription>
                  Multiple bankroll strategies with risk management and automated stake sizing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Kelly Criterion sizing
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Multiple bankrolls
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Risk alerts & limits
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Sheets Integration */}
            <Card className="group hover:shadow-xl transition-all duration-300" data-testid="feature-sheets">
              <CardHeader>
                <div className="h-12 w-12 bg-info/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-info/20 transition-colors">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Google Sheets Export</CardTitle>
                <CardDescription>
                  Seamlessly export your data to Google Sheets for custom analysis and reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    One-click sync
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Custom templates
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Real-time updates
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manual Entry */}
            <Card className="group hover:shadow-xl transition-all duration-300" data-testid="feature-manual">
              <CardHeader>
                <div className="h-12 w-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-warning/20 transition-colors">
                  <Upload className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Manual Bet Entry</CardTitle>
                <CardDescription>
                  Quick and easy manual entry for live bets, in-play wagers, and offline bookmakers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Smart form validation
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Quick-add templates
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Bulk import options
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Features */}
            <Card className="group hover:shadow-xl transition-all duration-300" data-testid="feature-premium">
              <CardHeader>
                <div className="h-12 w-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <Crown className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle>Premium Analytics</CardTitle>
                <CardDescription>
                  Advanced features for professional bettors including predictive modeling and AI insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Predictive modeling
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Market analysis
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Priority support
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof/Testimonials Section */}
      <section id="testimonials" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by Professional Bettors</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of successful sports bettors who use BetSnap to maximize their profits
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center" data-testid="testimonial-1">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-warning text-yellow-600" />
                    ))}
                  </div>
                </div>
                <Quote className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <CardDescription className="text-base leading-relaxed">
                  "BetSnap transformed my betting strategy. The AI extraction is incredibly accurate, 
                  and the analytics help me identify my most profitable markets. ROI increased 40% in 6 months."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">Mike Rodriguez</div>
                <div className="text-sm text-muted-foreground">Professional Sports Bettor</div>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="testimonial-2">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-warning text-yellow-600" />
                    ))}
                  </div>
                </div>
                <Quote className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <CardDescription className="text-base leading-relaxed">
                  "The bankroll management features are game-changing. Kelly Criterion sizing and risk alerts 
                  keep me disciplined. This is the most comprehensive betting tool I've ever used."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">Sarah Chen</div>
                <div className="text-sm text-muted-foreground">Sports Analytics Expert</div>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="testimonial-3">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-warning text-yellow-600" />
                    ))}
                  </div>
                </div>
                <Quote className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <CardDescription className="text-base leading-relaxed">
                  "I love how easy it is to track my bets across multiple sportsbooks. 
                  The Google Sheets integration saves me hours of manual data entry every week."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">David Thompson</div>
                <div className="text-sm text-muted-foreground">Betting Syndicate Manager</div>
              </CardContent>
            </Card>
          </div>

          {/* Trust badges */}
          <div className="flex justify-center items-center space-x-8 text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Bank-grade Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span className="text-sm">15,000+ Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span className="text-sm">Industry Leader</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and upgrade when you're ready. All plans include our core tracking features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="text-center" data-testid="pricing-free">
              <CardHeader>
                <div className="text-muted-foreground mb-2">Free</div>
                <div className="text-3xl font-bold mb-4">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <CardDescription>Perfect for casual bettors starting their journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-left">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    50 bet entries per month
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Basic analytics
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Manual bet entry
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    1 bankroll
                  </div>
                </div>
                <Link href="/register" className="block">
                  <Button className="w-full" variant="outline" data-testid="button-plan-free">
                    Get Started Free
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="text-center border-primary shadow-lg scale-105 relative" data-testid="pricing-premium">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                Most Popular
              </Badge>
              <CardHeader>
                <div className="text-primary mb-2 font-semibold">Premium</div>
                <div className="text-3xl font-bold mb-4">$29<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <CardDescription>For serious bettors who want to maximize profits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-left">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Unlimited bet entries
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    AI slip extraction
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Advanced analytics
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Google Sheets integration
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Multiple bankrolls
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Priority support
                  </div>
                </div>
                <Link href="/register?plan=premium" className="block">
                  <Button className="w-full" data-testid="button-plan-premium">
                    Start 14-Day Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="text-center" data-testid="pricing-enterprise">
              <CardHeader>
                <div className="text-muted-foreground mb-2">Enterprise</div>
                <div className="text-3xl font-bold mb-4">$99<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <CardDescription>For professional syndicates and high-volume bettors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-left">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Everything in Premium
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Predictive modeling
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    API access
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Custom integrations
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Dedicated support
                  </div>
                </div>
                <Link href="/pricing" className="block">
                  <Button className="w-full" variant="outline" data-testid="button-plan-enterprise">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-6">
              All plans include a 30-day money-back guarantee. Cancel anytime.
            </p>
            <Link href="/pricing">
              <Button variant="outline" data-testid="button-view-full-pricing">
                View Full Pricing Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Betting?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of successful sports bettors who use BetSnap to track, analyze, and optimize their performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-cta-start">
                <Camera className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary" data-testid="button-cta-demo">
              <BarChart3 className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl">BetSnap</span>
              </div>
              <p className="text-muted-foreground">
                The professional sports betting analytics platform trusted by successful bettors worldwide.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="icon" data-testid="social-twitter">
                  <Twitter className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" data-testid="social-linkedin">
                  <Linkedin className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" data-testid="social-github">
                  <Github className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-3 text-sm">
                <a href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
                <Link href="/pricing" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Integrations
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  API Docs
                </a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Press Kit
                </a>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Help Center
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>

          <div className="border-t pt-8 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-muted-foreground text-sm">
                © 2024 BetSnap. All rights reserved.
              </p>
              <div className="flex items-center space-x-6 text-sm text-muted-foreground mt-4 md:mt-0">
                <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                <a href="#" className="hover:text-foreground transition-colors">Status</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}