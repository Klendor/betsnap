import { google } from 'googleapis';
import type { User } from '@shared/schema';

const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

export interface GoogleSheetsService {
  getOAuthUrl(): string;
  handleOAuthCallback(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }>;
  createBetTrackingSheet(user: User): Promise<{ sheetId: string; newTokens?: { accessToken: string; expiresAt: Date } }>;
  addBetToSheet(user: User, betData: any): Promise<{ sheetRowId: string; newTokens?: { accessToken: string; expiresAt: Date } }>;
  updateBetInSheet(user: User, betData: any): Promise<{ newTokens?: { accessToken: string; expiresAt: Date } }>;
  syncExistingBets(user: User, bets: any[]): Promise<{ newTokens?: { accessToken: string; expiresAt: Date } }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }>;
  getBetTrackingTemplate(): any[];
}

class GoogleSheetsServiceImpl implements GoogleSheetsService {
  private oauth2Client: any;

  constructor() {
    // Initialize OAuth2 client - requires environment variables
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.REPL_URL || 'http://localhost:5000'}/api/auth/google/callback`;
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  getOAuthUrl(): string {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SHEETS_SCOPES,
      prompt: 'consent', // Force consent screen to ensure we get refresh token
    });
  }

  async handleOAuthCallback(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expiry_date ? (tokens.expiry_date - Date.now()) / 1000 : 3600));

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiresAt,
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error(`Failed to exchange OAuth code: ${error}`);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (credentials.expiry_date ? (credentials.expiry_date - Date.now()) / 1000 : 3600));

      return {
        accessToken: credentials.access_token,
        expiresAt,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  private async getAuthenticatedClient(user: User) {
    if (!user.googleAccessToken || !user.googleRefreshToken) {
      throw new Error('User not authenticated with Google');
    }

    // Check if token needs refresh
    const now = new Date();
    const expiry = user.googleTokenExpiry ? new Date(user.googleTokenExpiry) : new Date(0);
    
    if (now >= expiry) {
      // Token expired, refresh it
      const { accessToken, expiresAt } = await this.refreshAccessToken(user.googleRefreshToken);
      
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: user.googleRefreshToken,
      });
      
      return { newTokens: { accessToken, expiresAt } };
    } else {
      this.oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
      });
      
      return { newTokens: null };
    }
  }

  async createBetTrackingSheet(user: User): Promise<{ sheetId: string; newTokens?: { accessToken: string; expiresAt: Date } }> {
    try {
      const authResult = await this.getAuthenticatedClient(user);
      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Create new spreadsheet
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `BetSnap Tracker - ${user.name} - ${new Date().getFullYear()}`,
          },
          sheets: [
            {
              properties: {
                title: 'Bets',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 16,
                },
              },
            },
            {
              properties: {
                title: 'Analytics',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10,
                },
              },
            },
            {
              properties: {
                title: 'Monthly Summary',
                gridProperties: {
                  rowCount: 50,
                  columnCount: 8,
                },
              },
            },
          ],
        },
      });

      const sheetId = createResponse.data.spreadsheetId!;
      
      // Add enhanced template data
      await this.setupEnhancedBetTrackingTemplate(sheetId);
      
      return { 
        sheetId,
        newTokens: authResult.newTokens || undefined
      };
    } catch (error) {
      console.error('Error creating Google Sheet:', error);
      throw new Error(`Failed to create betting sheet: ${error}`);
    }
  }

  private async setupEnhancedBetTrackingTemplate(sheetId: string): Promise<void> {
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    
    // Enhanced headers for the Bets sheet
    const headers = [
      'Date',
      'Sport',
      'Event',
      'Bet Type',
      'Odds',
      'Stake',
      'Potential Payout',
      'Status',
      'Actual Payout',
      'Profit/Loss',
      'Win Rate',
      'Running Total',
      'ROI %',
      'Notes',
      'Screenshot',
      'Confidence'
    ];

    // Add headers with enhanced formatting
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Bets!A1:P1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    // Enhanced formatting for headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 11,
                  },
                  horizontalAlignment: 'CENTER',
                  borders: {
                    top: { style: 'SOLID', width: 1 },
                    bottom: { style: 'SOLID', width: 1 },
                    left: { style: 'SOLID', width: 1 },
                    right: { style: 'SOLID', width: 1 },
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,borders)',
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headers.length,
              },
            },
          },
        ],
      },
    });

    // Setup enhanced Analytics and Monthly Summary sheets
    await Promise.all([
      this.setupEnhancedAnalyticsSheet(sheetId),
      this.setupMonthlySummarySheet(sheetId),
    ]);
  }

  private async setupEnhancedAnalyticsSheet(sheetId: string): Promise<void> {
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    
    const analyticsData = [
      ['BetSnap Analytics Dashboard', '', ''],
      ['', '', ''],
      ['Overall Performance', 'Value', 'Formula'],
      ['Total Bets', '', '=COUNTA(Bets!A2:A)'],
      ['Won Bets', '', '=COUNTIF(Bets!H2:H,"won")'],
      ['Lost Bets', '', '=COUNTIF(Bets!H2:H,"lost")'],
      ['Pending Bets', '', '=COUNTIF(Bets!H2:H,"pending")'],
      ['Win Rate (%)', '', '=IF(B4=0,0,ROUND(B5/B4*100,2))'],
      ['Total Staked ($)', '', '=SUM(Bets!F2:F)'],
      ['Total Return ($)', '', '=SUM(Bets!I2:I)'],
      ['Net Profit ($)', '', '=B10-B9'],
      ['ROI (%)', '', '=IF(B9=0,0,ROUND(B11/B9*100,2))'],
      ['Average Stake ($)', '', '=IF(B4=0,0,ROUND(B9/B4,2))'],
      ['Best Sport', '', '=INDEX(Bets!B2:B,MODE(MATCH(Bets!B2:B,Bets!B2:B,0)))'],
      ['', '', ''],
      ['Sport Breakdown', '', ''],
      ['NBA', '', '=COUNTIF(Bets!B2:B,"NBA")'],
      ['NFL', '', '=COUNTIF(Bets!B2:B,"NFL")'],
      ['MLB', '', '=COUNTIF(Bets!B2:B,"MLB")'],
      ['NHL', '', '=COUNTIF(Bets!B2:B,"NHL")'],
      ['Soccer', '', '=COUNTIF(Bets!B2:B,"Soccer")'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Analytics!A1:C21',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: analyticsData,
      },
    });

    // Format the analytics sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 1,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 3,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 14,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
        ],
      },
    });
  }

  private async setupMonthlySummarySheet(sheetId: string): Promise<void> {
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    
    const monthlySummaryData = [
      ['Monthly Performance Summary', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Month', 'Total Bets', 'Won', 'Lost', 'Win Rate %', 'Net Profit', 'ROI %', 'Notes'],
      // Sample data for current month
      [`${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`, '=COUNTIFS(Bets!A2:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Bets!A2:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))', '', '', '', '', '', ''],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Monthly Summary!A1:H4',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: monthlySummaryData,
      },
    });
  }

  async addBetToSheet(user: User, betData: any): Promise<{ sheetRowId: string; newTokens?: { accessToken: string; expiresAt: Date } }> {
    try {
      const authResult = await this.getAuthenticatedClient(user);
      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      
      const nextRow = await this.getNextRow(user.googleSheetsId!);
      
      const values = [
        new Date(betData.createdAt).toLocaleDateString(),
        betData.sport,
        betData.event,
        betData.betType,
        betData.odds,
        parseFloat(betData.stake),
        parseFloat(betData.potentialPayout),
        betData.status,
        betData.actualPayout ? parseFloat(betData.actualPayout) : '',
        betData.actualPayout ? `=I${nextRow}-F${nextRow}` : '',
        `=IF(B4=0,0,ROUND(COUNTIF(H2:H${nextRow},"won")/COUNTA(A2:A${nextRow})*100,2))`,
        `=SUM(J2:J${nextRow})`,
        `=IF(L${nextRow}=0,0,ROUND(L${nextRow}/SUM(F2:F${nextRow})*100,2))`,
        '',
        betData.screenshotUrl || '',
        JSON.parse(betData.extractedData || '{}').confidence || '',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: user.googleSheetsId!,
        range: 'Bets!A:P',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      
      // Return the row ID for future updates
      const sheetRowId = `${nextRow}`;
      
      return { 
        sheetRowId,
        newTokens: authResult.newTokens || undefined 
      };
    } catch (error) {
      console.error('Error adding bet to sheet:', error);
      throw new Error(`Failed to add bet to sheet: ${error}`);
    }
  }

  async updateBetInSheet(user: User, betData: any): Promise<{ newTokens?: { accessToken: string; expiresAt: Date } }> {
    try {
      const authResult = await this.getAuthenticatedClient(user);
      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      
      if (!betData.sheetRowId) {
        throw new Error('Bet not synced to sheet - sheetRowId missing');
      }
      
      const rowNumber = parseInt(betData.sheetRowId);
      
      const values = [
        new Date(betData.createdAt).toLocaleDateString(),
        betData.sport,
        betData.event,
        betData.betType,
        betData.odds,
        parseFloat(betData.stake),
        parseFloat(betData.potentialPayout),
        betData.status,
        betData.actualPayout ? parseFloat(betData.actualPayout) : '',
        betData.actualPayout ? `=I${rowNumber}-F${rowNumber}` : '',
        `=IF(B4=0,0,ROUND(COUNTIF(H2:H${rowNumber},"won")/COUNTA(A2:A${rowNumber})*100,2))`,
        `=SUM(J2:J${rowNumber})`,
        `=IF(L${rowNumber}=0,0,ROUND(L${rowNumber}/SUM(F2:F${rowNumber})*100,2))`,
        betData.notes || '',
        betData.screenshotUrl || '',
        JSON.parse(betData.extractedData || '{}').confidence || '',
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: user.googleSheetsId!,
        range: `Bets!A${rowNumber}:P${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      
      return { newTokens: authResult.newTokens || undefined };
    } catch (error) {
      console.error('Error updating bet in sheet:', error);
      throw new Error(`Failed to update bet in sheet: ${error}`);
    }
  }

  async syncExistingBets(user: User, bets: any[]): Promise<{ newTokens?: { accessToken: string; expiresAt: Date } }> {
    try {
      const authResult = await this.getAuthenticatedClient(user);
      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      
      if (bets.length === 0) return { newTokens: authResult.newTokens || undefined };

      const values = bets.map((bet, index) => {
        const rowNumber = index + 2; // Starting from row 2 (after header)
        return [
          new Date(bet.createdAt).toLocaleDateString(),
          bet.sport,
          bet.event,
          bet.betType,
          bet.odds,
          parseFloat(bet.stake),
          parseFloat(bet.potentialPayout),
          bet.status,
          bet.actualPayout ? parseFloat(bet.actualPayout) : '',
          bet.actualPayout ? `=I${rowNumber}-F${rowNumber}` : '',
          `=IF(B4=0,0,ROUND(COUNTIF(H2:H${rowNumber},"won")/COUNTA(A2:A${rowNumber})*100,2))`,
          `=SUM(J2:J${rowNumber})`,
          `=IF(L${rowNumber}=0,0,ROUND(L${rowNumber}/SUM(F2:F${rowNumber})*100,2))`,
          '',
          bet.screenshotUrl || '',
          JSON.parse(bet.extractedData || '{}').confidence || '',
        ];
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: user.googleSheetsId!,
        range: `Bets!A2:P${values.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });
      
      return { newTokens: authResult.newTokens || undefined };
    } catch (error) {
      console.error('Error syncing existing bets:', error);
      throw new Error(`Failed to sync existing bets: ${error}`);
    }
  }

  private async getNextRow(sheetId: string): Promise<number> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Bets!A:A',
      });
      
      return (response.data.values?.length || 1) + 1;
    } catch (error) {
      return 2; // Default to row 2 if error
    }
  }

  getBetTrackingTemplate(): any[] {
    return [
      {
        name: 'Professional Tracker',
        description: 'Comprehensive tracking with advanced analytics, monthly summaries, and visual insights',
        features: [
          'Real-time bet synchronization',
          'Advanced ROI calculations',
          'Monthly performance breakdowns',
          'Sport-specific analytics',
          'Win rate trending',
          'Profit/loss tracking',
          'Beautiful formatting'
        ],
      },
      {
        name: 'Enhanced Analytics',
        description: 'Complete dashboard for serious bettors with all the metrics you need',
        features: [
          'Comprehensive statistics',
          'Performance by sport',
          'Bankroll management',
          'Custom formulas',
          'Historical analysis'
        ],
      },
    ];
  }
}

export const googleSheetsService = new GoogleSheetsServiceImpl();