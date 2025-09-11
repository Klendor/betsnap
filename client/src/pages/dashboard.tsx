import Navigation from "@/components/navigation";
import BetStats from "@/components/bet-stats";
import CaptureInterface from "@/components/capture-interface";
import RecentBetsTable from "@/components/recent-bets-table";
import Sidebar from "@/components/sidebar";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BetStats />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <CaptureInterface />
            <RecentBetsTable />
          </div>
          
          <div className="lg:col-span-1">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
