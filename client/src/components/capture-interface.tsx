import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import FileDropzone from "./file-dropzone";
import { betsService } from "@/lib/services/bets";
import { bankrollsService, type Bankroll } from "@/lib/services/bankrolls";
import { Camera, CloudUpload, Edit, Table, Loader2, Wallet, AlertTriangle } from "lucide-react";

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
  const [selectedBankrollId, setSelectedBankrollId] = useState<string>("");
  const [stakeUnits, setStakeUnits] = useState<string>("");
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's bankrolls
  const { data: bankrolls = [], isLoading: bankrollsLoading } = useQuery<Bankroll[]>({
    queryKey: ['bankrolls'],
    queryFn: bankrollsService.getUserBankrolls,
    enabled: !!profile,
  });

  // Get the selected bankroll details
  const selectedBankroll = bankrolls.find(b => b.id === selectedBankrollId);

  // Auto-select active bankroll on load
  useEffect(() => {
    const activeBankroll = bankrolls.find(b => b.is_active);
    if (activeBankroll && !selectedBankrollId) {
      setSelectedBankrollId(activeBankroll.id);
    }
  }, [bankrolls, selectedBankrollId]);

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
      return await betsService.createBet(betData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
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
    if (!extractedData || !selectedBankrollId) {
      toast({
        title: "Validation Error",
        description: "Please select a bankroll before saving the bet",
        variant: "destructive",
      });
      return;
    }

    const stake = parseFloat(extractedData.stake);
    if (isNaN(stake) || stake <= 0) {
      toast({
        title: "Validation Error", 
        description: "Invalid stake amount",
        variant: "destructive",
      });
      return;
    }

    const betData = {
      sport: extractedData.sport,
      event: extractedData.event,
      bet_type: extractedData.betType,
      odds: extractedData.odds,
      stake: parseFloat(extractedData.stake),
      stake_units: parseFloat(stakeUnits) || 1,
      potential_payout: parseFloat(extractedData.potentialPayout),
      status: "pending" as const,
      bankroll_id: selectedBankrollId,
      extracted_data: extractedData,
    };

    saveBetMutation.mutate(betData);
  };

  const handleDataChange = (field: keyof ExtractedData, value: string) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
    
    // Auto-update units when stake changes
    if (field === 'stake' && selectedBankroll) {
      const stakeValue = parseFloat(value);
      if (!isNaN(stakeValue) && stakeValue > 0) {
        const unitValue = selectedBankroll.unit_value;
        if (selectedBankroll.unit_mode === 'fixed') {
          const units = stakeValue / unitValue;
          setStakeUnits(units.toFixed(2));
        } else {
          // For percent mode, units = stake percentage / unit percentage
          const balanceNeeded = stakeValue / unitValue; // Rough estimate
          setStakeUnits((stakeValue / unitValue).toFixed(2));
        }
      }
    }
  };

  const handleUnitsChange = (units: string) => {
    setStakeUnits(units);
    
    if (!extractedData || !selectedBankroll) return;
    
    const unitsValue = parseFloat(units);
    if (!isNaN(unitsValue) && unitsValue > 0) {
      const unitValue = selectedBankroll.unit_value;
      let stakeValue: number;
      
      if (selectedBankroll.unit_mode === 'fixed') {
        stakeValue = unitsValue * unitValue;
      } else {
        // For percent mode, this would need current balance but we'll use a simple calculation
        stakeValue = unitsValue * unitValue;
      }
      
      setExtractedData({ ...extractedData, stake: stakeValue.toFixed(2) });
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
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

        {/* Bankroll Selection */}
        {bankrolls.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Select Bankroll</Label>
            <Select value={selectedBankrollId} onValueChange={setSelectedBankrollId}>
              <SelectTrigger data-testid="select-bankroll">
                <SelectValue placeholder="Choose a bankroll for this bet">
                  {selectedBankroll && (
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4" />
                      <span>{selectedBankroll.name}</span>
                      {selectedBankroll.isActive === 1 && (
                        <span className="text-xs bg-primary/20 text-primary px-1 rounded">Active</span>
                      )}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bankrolls.map((bankroll) => (
                  <SelectItem key={bankroll.id} value={bankroll.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-4 w-4" />
                        <span>{bankroll.name}</span>
                        {bankroll.isActive === 1 && (
                          <span className="text-xs bg-primary/20 text-primary px-1 rounded">Active</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {bankroll.currency} • {bankroll.unitMode === 'fixed' ? 'Fixed' : 'Percent'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedBankroll && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <div className="flex justify-between">
                  <span>Unit Value:</span>
                  <span>
                    {selectedBankroll.unitMode === 'fixed' 
                      ? formatCurrency(parseFloat(selectedBankroll.unitValue), selectedBankroll.currency)
                      : `${(parseFloat(selectedBankroll.unitValue) * 100).toFixed(2)}%`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {bankrolls.length === 0 && !bankrollsLoading && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to create a bankroll first. 
              <Button variant="link" className="p-0 h-auto font-normal underline ml-1" asChild>
                <a href="/bankrolls">Create a bankroll</a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Extracted Data Preview */}
        {extractedData && selectedBankrollId && (
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
                {selectedBankroll && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {stakeUnits || '0'} units
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="units" className="text-sm font-medium text-muted-foreground">Stake (Units)</Label>
                <Input
                  id="units"
                  type="number"
                  step="0.01"
                  value={stakeUnits}
                  onChange={(e) => handleUnitsChange(e.target.value)}
                  placeholder="1.0"
                  data-testid="input-units"
                />
                {selectedBankroll && (
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatCurrency(parseFloat(stakeUnits || '0') * parseFloat(selectedBankroll.unitValue), selectedBankroll.currency)}
                  </p>
                )}
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
                  disabled={saveBetMutation.isPending || !selectedBankrollId}
                  data-testid="button-save"
                >
                  {saveBetMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Table className="w-4 h-4 mr-2" />
                  )}
                  Save to Bankroll
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
