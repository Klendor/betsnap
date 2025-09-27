import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, useLocation } from "wouter";
import { Camera, Crown, User, LogOut, Settings, BarChart3, Wallet, Menu, X, TrendingUp, Home } from "lucide-react";

export default function Navigation() {
  const { profile, isAuthenticated, signOut } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = () => {
    if (!profile?.name) return 'U';
    return profile.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Mobile Navigation Link Component - Fixed scoping issue
  const MobileNavLink = ({ 
    href, 
    icon: Icon, 
    label, 
    isActive, 
    onClick 
  }: {
    href: string;
    icon: any;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => {
    if (href === '#') {
      return (
        <button 
          onClick={onClick}
          className={`flex items-center gap-3 w-full px-3 py-3 text-left rounded-lg transition-colors ${
            isActive 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : 'hover:bg-accent/10 text-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="font-medium">{label}</span>
        </button>
      );
    }

    return (
      <Link href={href}>
        <button 
          onClick={onClick}
          className={`flex items-center gap-3 w-full px-3 py-3 text-left rounded-lg transition-colors ${
            isActive 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : 'hover:bg-accent/10 text-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="font-medium">{label}</span>
        </button>
      </Link>
    );
  };

  return (
    <nav className="bg-card border-b border-border shadow-sm" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center" data-testid="logo">
              <Camera className="text-primary text-2xl" />
              <span className="ml-3 text-xl font-bold text-foreground">BetSnap</span>
            </Link>
            {isAuthenticated && (
              <div className="hidden lg:flex space-x-8 ml-8">
                <Link 
                  href="/dashboard" 
                  className={`font-medium transition-colors text-interactive ${
                    location === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="nav-dashboard"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/bets" 
                  className={`font-medium transition-colors text-interactive ${
                    location === '/bets' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="nav-bets"
                >
                  Bets
                </Link>
                <Link 
                  href="/bankrolls" 
                  className={`font-medium transition-colors text-interactive ${
                    location.startsWith('/bankrolls') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="nav-bankrolls"
                >
                  Bankrolls
                </Link>
                <Link 
                  href="/analytics" 
                  className={`font-medium transition-colors text-interactive ${
                    location === '/analytics' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="nav-analytics"
                >
                  Analytics
                </Link>
              </div>
            )}
            {/* Always show Pricing link */}
            <div className="hidden lg:flex">
              <Link 
                href="/pricing" 
                className={`font-medium transition-colors text-interactive ${
                  location === '/pricing' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="nav-pricing"
              >
                Pricing
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Mobile Menu */}
            {isAuthenticated && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden hover:bg-accent/10" 
                    data-testid="mobile-menu-trigger"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle mobile menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 px-0">
                  <SheetHeader className="px-6 pb-4">
                    <SheetTitle className="flex items-center gap-3">
                      <Camera className="text-primary text-xl" />
                      <span className="text-xl font-bold">BetSnap</span>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-1 px-4">
                    <MobileNavLink 
                      href="/dashboard" 
                      icon={Home} 
                      label="Dashboard" 
                      isActive={location === '/dashboard'}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <MobileNavLink 
                      href="/bets" 
                      icon={TrendingUp} 
                      label="Bets" 
                      isActive={location === '/bets'}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <MobileNavLink 
                      href="/bankrolls" 
                      icon={Wallet} 
                      label="Bankrolls" 
                      isActive={location.startsWith('/bankrolls')}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <MobileNavLink 
                      href="/analytics" 
                      icon={BarChart3} 
                      label="Analytics" 
                      isActive={location === '/analytics'}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <MobileNavLink 
                      href="/pricing" 
                      icon={Crown} 
                      label="Pricing" 
                      isActive={location === '/pricing'}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    
                    <div className="pt-4 mt-4 border-t border-border">
                      <div className="px-3 py-2">
                        <p className="text-micro">Account</p>
                      </div>
                      <MobileNavLink 
                        href="#" 
                        icon={Settings} 
                        label="Settings" 
                        isActive={false}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                      <button 
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-3 text-left rounded-lg transition-colors hover:bg-destructive/10 text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="font-medium">Log out</span>
                      </button>
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-border">
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-micro">Theme</p>
                        <ThemeToggle />
                      </div>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            
            {isAuthenticated ? (
              <>
                {profile?.subscription_plan === 'premium' && (
                  <Badge variant="secondary" className="hidden sm:flex items-center space-x-2 bg-accent/10 text-accent" data-testid="premium-badge">
                    <Crown className="w-3 h-3" />
                    <span>Premium</span>
                  </Badge>
                )}
                <Button className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="capture-button">
                  <Camera className="w-4 h-4 mr-2" />
                  <span className="hidden md:inline">Capture Bet</span>
                  <span className="md:hidden">Capture</span>
                </Button>
                <div className="hidden lg:block">
                  <ThemeToggle />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="user-menu">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {profile?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem data-testid="menu-settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild data-testid="menu-bankrolls">
                      <Link href="/bankrolls" className="flex items-center">
                        <Wallet className="mr-2 h-4 w-4" />
                        <span>Bankrolls</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild data-testid="menu-analytics">
                      <Link href="/analytics" className="flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Analytics</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild data-testid="menu-subscription">
                      <Link href="/subscription" className="flex items-center">
                        <Crown className="mr-2 h-4 w-4" />
                        <span>Subscription</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      data-testid="menu-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/pricing" className="lg:hidden">
                  <Button variant="ghost" data-testid="nav-pricing-mobile" size="sm">
                    Pricing
                  </Button>
                </Link>
                <ThemeToggle />
                <Link href="/login">
                  <Button variant="ghost" data-testid="nav-login" size="sm">
                    <span className="hidden sm:inline">Log in</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                </Link>
                <Link href="/register">
                  <Button data-testid="nav-register" size="sm">
                    <span className="hidden sm:inline">Sign up</span>
                    <span className="sm:hidden">Join</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
