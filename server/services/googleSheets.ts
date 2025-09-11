import { google } from 'googleapis';

const GOOGLE_SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export interface GoogleSheetsService {
  createBetTrackingSheet(userEmail: string): Promise<string>;
  addBetToSheet(sheetId: string, betData: any): Promise<void>;
  getBetTrackingTemplate(): any[];
}

class GoogleSheetsServiceImpl implements GoogleSheetsService {
  private auth: any;

  constructor() {
    // Initialize Google Auth - in production this would use service account credentials
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: GOOGLE_SHEETS_SCOPES,
    });
  }

  async createBetTrackingSheet(userEmail: string): Promise<string> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Create new spreadsheet
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `BetSnap Tracker - ${new Date().getFullYear()}`,
          },
          sheets: [
            {
              properties: {
                title: 'Bets',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 15,
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
          ],
        },
      });

      const sheetId = createResponse.data.spreadsheetId!;
      
      // Add header row and template data
      await this.setupBetTrackingTemplate(sheetId);
      
      // Share with user
      const drive = google.drive({ version: 'v3', auth: this.auth });
      await drive.permissions.create({
        fileId: sheetId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: userEmail,
        },
      });

      return sheetId;
    } catch (error) {
      console.error('Error creating Google Sheet:', error);
      throw new Error(`Failed to create betting sheet: ${error}`);
    }
  }

  private async setupBetTrackingTemplate(sheetId: string): Promise<void> {
    const sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    // Headers for the Bets sheet
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
      'Notes',
      'Screenshot',
      'Confidence'
    ];

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Bets!A1:O1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    // Format headers
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
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    });

    // Setup Analytics sheet
    await this.setupAnalyticsSheet(sheetId);
  }

  private async setupAnalyticsSheet(sheetId: string): Promise<void> {
    const sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    const analyticsData = [
      ['Metric', 'Value', 'Formula'],
      ['Total Bets', '', '=COUNTA(Bets!A2:A)'],
      ['Won Bets', '', '=COUNTIF(Bets!H2:H,"Won")'],
      ['Lost Bets', '', '=COUNTIF(Bets!H2:H,"Lost")'],
      ['Pending Bets', '', '=COUNTIF(Bets!H2:H,"Pending")'],
      ['Win Rate', '', '=IF(B2=0,0,B3/B2)'],
      ['Total Staked', '', '=SUM(Bets!F2:F)'],
      ['Total Return', '', '=SUM(Bets!I2:I)'],
      ['Net Profit', '', '=B8-B7'],
      ['ROI', '', '=IF(B7=0,0,B9/B7)'],
      ['Best Sport', '', '=INDEX(Bets!B2:B,MODE(MATCH(Bets!B2:B,Bets!B2:B,0)))'],
      ['Average Stake', '', '=AVERAGE(Bets!F2:F)'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Analytics!A1:C12',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: analyticsData,
      },
    });
  }

  async addBetToSheet(sheetId: string, betData: any): Promise<void> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
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
        betData.actualPayout ? 
          `=I${await this.getNextRow(sheetId)}-F${await this.getNextRow(sheetId)}` : '',
        `=IF(H${await this.getNextRow(sheetId)}="Won",1,IF(H${await this.getNextRow(sheetId)}="Lost",0,""))`,
        `=SUM(J2:J${await this.getNextRow(sheetId)})`,
        '',
        betData.screenshotUrl || '',
        JSON.parse(betData.extractedData || '{}').confidence || '',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Bets!A:O',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
    } catch (error) {
      console.error('Error adding bet to sheet:', error);
      throw new Error(`Failed to add bet to sheet: ${error}`);
    }
  }

  private async getNextRow(sheetId: string): Promise<number> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
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
        name: 'Basic Tracker',
        description: 'Simple bet tracking with profit/loss calculations',
        features: ['Win/Loss tracking', 'Profit calculations', 'Basic statistics'],
      },
      {
        name: 'Advanced Analytics',
        description: 'Comprehensive tracking with advanced metrics and charts',
        features: ['ROI analysis', 'Sport-specific breakdowns', 'Trend analysis', 'Visual charts'],
      },
      {
        name: 'Professional',
        description: 'Full-featured tracking for serious bettors',
        features: ['Bankroll management', 'Kelly Criterion', 'Advanced statistics', 'Custom formulas'],
      },
    ];
  }
}

export const googleSheetsService = new GoogleSheetsServiceImpl();
