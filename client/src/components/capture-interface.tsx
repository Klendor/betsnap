import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import FileDropzone from "./file-dropzone";
import { apiRequest } from "@/lib/queryClient";
import { Camera, CloudUpload, Edit, Table, Loader2 } from "lucide-react";

interface ExtractedData {
  sport: string;
  event: string;
  betType: string;
  odds: string;
  stake: string;
  potentialPayout: string;
  confidence: number;
}

export default function CaptureInterface() {
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('screenshot', file);
      
      const response = await fetch('/api/screenshots/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.extractedData) {
        setExtractedData(data.extractedData);
        toast({
          title: "Screenshot processed!",
          description: "AI has extracted your bet data successfully.",
        });
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Please try again with a different screenshot.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const saveBetMutation = useMutation({
    mutationFn: async (betData: any) => {
      return await apiRequest('POST', '/api/bets', betData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
      toast({
        title: "Bet saved!",
        description: "Your bet has been added to the tracking system.",
      });
      setExtractedData(null);
    },
    onError: (error) => {
      console.error('Save failed:', error);
      toast({
        title: "Save failed",
        description: "Please check the data and try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (file: File) => {
    setIsProcessing(true);
    uploadMutation.mutate(file);
  };

  const handleSaveBet = () => {
    if (!extractedData) return;

    const betData = {
      sport: extractedData.sport,
      event: extractedData.event,
      betType: extractedData.betType,
      odds: extractedData.odds,
      stake: extractedData.stake,
      potentialPayout: extractedData.potentialPayout,
      status: "pending",
      extractedData: JSON.stringify(extractedData),
    };

    saveBetMutation.mutate(betData);
  };

  const handleDataChange = (field: keyof ExtractedData, value: string) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
  };

  return (
    <Card className="shadow-sm" data-testid="capture-interface">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Quick Capture</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span className="text-sm text-muted-foreground">AI Ready</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div data-testid="upload-area">
          <FileDropzone onFileUpload={handleFileUpload} />
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-muted/50 rounded-lg p-4" data-testid="processing-status">
            <div className="flex items-center space-x-3">
              <Loader2 className="animate-spin w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Processing with Gemini AI...</p>
                <p className="text-sm text-muted-foreground">Extracting bet data from your screenshot</p>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Data Preview */}
        {extractedData && (
          <div className="border border-border rounded-lg p-4" data-testid="extracted-data">
            <h4 className="font-medium text-foreground mb-3">Extracted Bet Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sport" className="text-sm font-medium text-muted-foreground">Sport</Label>
                <Input
                  id="sport"
                  value={extractedData.sport}
                  onChange={(e) => handleDataChange('sport', e.target.value)}
                  data-testid="input-sport"
                />
              </div>
              <div>
                <Label htmlFor="event" className="text-sm font-medium text-muted-foreground">Teams/Event</Label>
                <Input
                  id="event"
                  value={extractedData.event}
                  onChange={(e) => handleDataChange('event', e.target.value)}
                  data-testid="input-event"
                />
              </div>
              <div>
                <Label htmlFor="betType" className="text-sm font-medium text-muted-foreground">Bet Type</Label>
                <Input
                  id="betType"
                  value={extractedData.betType}
                  onChange={(e) => handleDataChange('betType', e.target.value)}
                  data-testid="input-bet-type"
                />
              </div>
              <div>
                <Label htmlFor="odds" className="text-sm font-medium text-muted-foreground">Odds</Label>
                <Input
                  id="odds"
                  value={extractedData.odds}
                  onChange={(e) => handleDataChange('odds', e.target.value)}
                  data-testid="input-odds"
                />
              </div>
              <div>
                <Label htmlFor="stake" className="text-sm font-medium text-muted-foreground">Stake Amount</Label>
                <Input
                  id="stake"
                  value={`$${extractedData.stake}`}
                  onChange={(e) => handleDataChange('stake', e.target.value.replace('$', ''))}
                  data-testid="input-stake"
                />
              </div>
              <div>
                <Label htmlFor="payout" className="text-sm font-medium text-muted-foreground">Potential Payout</Label>
                <Input
                  id="payout"
                  value={`$${extractedData.potentialPayout}`}
                  onChange={(e) => handleDataChange('potentialPayout', e.target.value.replace('$', ''))}
                  data-testid="input-payout"
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                AI Confidence: {Math.round(extractedData.confidence * 100)}%
              </p>
              <div className="flex space-x-3">
                <Button variant="outline" data-testid="button-edit">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={handleSaveBet}
                  disabled={saveBetMutation.isPending}
                  data-testid="button-save"
                >
                  {saveBetMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Table className="w-4 h-4 mr-2" />
                  )}
                  Save to Sheets
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
