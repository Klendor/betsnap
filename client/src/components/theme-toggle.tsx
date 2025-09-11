import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor, Check } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const getIcon = () => {
    switch (resolvedTheme) {
      case 'dark':
        return <Moon className="h-4 w-4 transition-all" />;
      case 'light':
        return <Sun className="h-4 w-4 transition-all" />;
      default:
        return <Sun className="h-4 w-4 transition-all" />;
    }
  };

  const getThemeIcon = (themeOption: string) => {
    switch (themeOption) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getThemeLabel = (themeOption: string) => {
    switch (themeOption) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return '';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-md border-0 hover:bg-accent/10 transition-all duration-200 group"
          data-testid="theme-toggle"
        >
          <div className="relative">
            {getIcon()}
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          </div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 mt-1 border border-border/50 bg-card/95 backdrop-blur-sm shadow-lg"
        data-testid="theme-menu"
      >
        {(['light', 'dark', 'system'] as const).map((themeOption) => (
          <DropdownMenuItem
            key={themeOption}
            onClick={() => setTheme(themeOption)}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/10 transition-colors duration-150"
            data-testid={`theme-option-${themeOption}`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-4 h-4">
                {getThemeIcon(themeOption)}
              </div>
              <span className="text-sm font-medium">
                {getThemeLabel(themeOption)}
              </span>
            </div>
            {theme === themeOption && (
              <Check className="h-4 w-4 text-primary transition-all duration-200" />
            )}
          </DropdownMenuItem>
        ))}
        <div className="px-3 py-2 border-t border-border/30 mt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            System uses your device's theme preference
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}