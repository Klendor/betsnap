import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import RecentBetsTable from "@/components/recent-bets-table";

export default function Bets() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
                My Bets
              </h1>
              <p className="text-muted-foreground">
                View and manage all your betting history
              </p>
            </div>
          </div>
          <Button 
            className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-add-bet"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Bet
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search bets..."
                  className="w-full"
                  data-testid="input-search-bets"
                />
              </div>
              <Button variant="outline" data-testid="button-filter">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" data-testid="button-search">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentBetsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}