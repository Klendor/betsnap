import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Crown, User } from "lucide-react";

export default function Navigation() {
  return (
    <nav className="bg-card border-b border-border shadow-sm" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center" data-testid="logo">
              <Camera className="text-primary text-2xl" />
              <span className="ml-3 text-xl font-bold text-foreground">BetSnap</span>
            </div>
            <div className="hidden md:flex space-x-6 ml-8">
              <a href="#" className="text-primary font-medium" data-testid="nav-dashboard">
                Dashboard
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-bets">
                Bets
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-analytics">
                Analytics
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-settings">
                Settings
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="hidden md:flex items-center space-x-2 bg-accent/10 text-accent" data-testid="premium-badge">
              <Crown className="w-3 h-3" />
              <span>Premium</span>
            </Badge>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="capture-button">
              <Camera className="w-4 h-4 mr-2" />
              Capture Bet
            </Button>
            <Avatar className="w-8 h-8" data-testid="user-avatar">
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </nav>
  );
}
