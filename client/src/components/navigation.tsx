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
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Camera, Crown, User, LogOut, Settings, BarChart3 } from "lucide-react";

export default function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
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
              <div className="hidden md:flex space-x-6 ml-8">
                <Link 
                  href="/dashboard" 
                  className="text-primary font-medium hover:text-primary/80 transition-colors" 
                  data-testid="nav-dashboard"
                >
                  Dashboard
                </Link>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-bets">
                  Bets
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-analytics">
                  Analytics
                </a>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {user?.subscriptionPlan === 'premium' && (
                  <Badge variant="secondary" className="hidden md:flex items-center space-x-2 bg-accent/10 text-accent" data-testid="premium-badge">
                    <Crown className="w-3 h-3" />
                    <span>Premium</span>
                  </Badge>
                )}
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="capture-button">
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Bet
                </Button>
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
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem data-testid="menu-settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-analytics">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Analytics</span>
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
                <Link href="/login">
                  <Button variant="ghost" data-testid="nav-login">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button data-testid="nav-register">
                    Sign up
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
