import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBetSchema, updateBetSchema, insertScreenshotSchema, registerSchema, loginSchema, insertBankrollSchema, updateBankrollSchema, insertBankrollTransactionSchema, insertBankrollGoalSchema, updateBankrollGoalSchema } from "@shared/schema";
import { requireAuth, getCurrentUser } from "./index";
import { extractBetDataFromImage, validateBetData } from "./services/gemini";
import { googleSheetsService } from "./services/googleSheets";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    
    // Check MIME type first
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    
    // Fallback: check file extension if MIME type detection fails
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      console.log('Accepting file based on extension:', fileExtension);
      cb(null, true);
      return;
    }
    
    console.error('File rejected:', {
      mimetype: file.mimetype,
      extension: fileExtension,
      allowedTypes,
      allowedExtensions
    });
    
    cb(new Error(`Invalid file type. Only images (JPG, PNG, WEBP) and PDFs are allowed. Received: ${file.mimetype || 'unknown'} for file: ${file.originalname}`));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const user = await storage.createUser(validatedData);
      
      // Set session
      req.session.user = user;
      
      res.json({ user, message: "Registration successful" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.validatePassword(validatedData.email, validatedData.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session
      req.session.user = user;
      
      res.json({ user, message: "Login successful" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(user);
  });

  // Get current user (requires authentication)
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get user stats (requires authentication)
  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const stats = await storage.getUserStats(user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Get advanced analytics (requires authentication)
  app.get("/api/user/analytics", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Parse optional date range from query params
      const { dateFrom, dateTo } = req.query;
      const fromDate = dateFrom ? new Date(dateFrom as string) : undefined;
      const toDate = dateTo ? new Date(dateTo as string) : undefined;
      
      const analytics = await storage.getAdvancedAnalytics(user.id, fromDate, toDate);
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to get analytics data" });
    }
  });

  // Get user bets (requires authentication)
  app.get("/api/bets", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const bets = await storage.getBetsByUser(user.id);
      res.json(bets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bets" });
    }
  });

  // Create a new bet (requires authentication)
  app.post("/api/bets", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const validatedData = insertBetSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const bet = await storage.createBet(validatedData);
      
      // Add to Google Sheets if user has connected sheets
      if (user?.googleSheetsId && user?.googleSheetsConnected) {
        try {
          const sheetResult = await googleSheetsService.addBetToSheet(user, bet);
          // Update bet with sheetRowId and tokens if they were refreshed
          const updates: any = { sheetRowId: sheetResult.sheetRowId };
          if (sheetResult.newTokens) {
            await storage.updateUser(user.id, {
              googleAccessToken: sheetResult.newTokens.accessToken,
              googleTokenExpiry: sheetResult.newTokens.expiresAt,
            });
          }
          await storage.updateBet(bet.id, updates, user.id);
          bet.sheetRowId = sheetResult.sheetRowId;
        } catch (error) {
          console.error("Failed to add bet to Google Sheets:", error);
          // Continue even if sheets update fails
        }
      }
      
      res.json(bet);
    } catch (error) {
      res.status(400).json({ message: "Invalid bet data" });
    }
  });

  // Update bet (requires authentication) - Enhanced with validation and history
  app.patch("/api/bets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Validate request data
      const validatedUpdates = updateBetSchema.parse(req.body);
      
      const bet = await storage.updateBet(id, validatedUpdates, user.id);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Update Google Sheets if user has connected sheets and bet has sheetRowId
      if (user?.googleSheetsId && user?.googleSheetsConnected && bet.sheetRowId) {
        try {
          const sheetResult = await googleSheetsService.updateBetInSheet(user, bet);
          // Update tokens if they were refreshed
          if (sheetResult.newTokens) {
            await storage.updateUser(user.id, {
              googleAccessToken: sheetResult.newTokens.accessToken,
              googleTokenExpiry: sheetResult.newTokens.expiresAt,
            });
          }
        } catch (error) {
          console.error("Failed to update bet in Google Sheets:", error);
          // Continue even if sheets update fails
        }
      }
      
      res.json(bet);
    } catch (error) {
      console.error("Update bet error:", error);
      if (error.message.includes("actualPayout")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(400).json({ message: "Failed to update bet" });
    }
  });

  // Delete bet (requires authentication)
  app.delete("/api/bets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get bet before deletion for Google Sheets sync
      const bet = await storage.getBet(id);
      if (!bet || bet.userId !== user.id) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      const deleted = await storage.deleteBet(id, user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Remove from Google Sheets if user has connected sheets and bet had sheetRowId
      if (user?.googleSheetsId && user?.googleSheetsConnected && bet.sheetRowId) {
        try {
          if (googleSheetsService.deleteBetFromSheet) {
            const sheetResult = await googleSheetsService.deleteBetFromSheet(user, bet.sheetRowId);
            // Update tokens if they were refreshed
            if (sheetResult.newTokens) {
              await storage.updateUser(user.id, {
                googleAccessToken: sheetResult.newTokens.accessToken,
                googleTokenExpiry: sheetResult.newTokens.expiresAt,
              });
            }
          }
        } catch (error) {
          console.error("Failed to delete bet from Google Sheets:", error);
          // Continue even if sheets deletion fails
        }
      }
      
      res.json({ message: "Bet deleted successfully" });
    } catch (error) {
      console.error("Delete bet error:", error);
      res.status(400).json({ message: "Failed to delete bet" });
    }
  });

  // Duplicate bet (requires authentication)
  app.post("/api/bets/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const duplicatedBet = await storage.duplicateBet(id, user.id);
      if (!duplicatedBet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Add to Google Sheets if user has connected sheets
      if (user?.googleSheetsId && user?.googleSheetsConnected) {
        try {
          const sheetResult = await googleSheetsService.addBetToSheet(user, duplicatedBet);
          // Update bet with sheetRowId and tokens if they were refreshed
          const updates: any = { sheetRowId: sheetResult.sheetRowId };
          if (sheetResult.newTokens) {
            await storage.updateUser(user.id, {
              googleAccessToken: sheetResult.newTokens.accessToken,
              googleTokenExpiry: sheetResult.newTokens.expiresAt,
            });
          }
          await storage.updateBet(duplicatedBet.id, updates, user.id);
          duplicatedBet.sheetRowId = sheetResult.sheetRowId;
        } catch (error) {
          console.error("Failed to add duplicated bet to Google Sheets:", error);
          // Continue even if sheets update fails
        }
      }
      
      res.json(duplicatedBet);
    } catch (error) {
      console.error("Duplicate bet error:", error);
      res.status(400).json({ message: "Failed to duplicate bet" });
    }
  });

  // Bulk bet operations (requires authentication)
  app.post("/api/bets/bulk", requireAuth, async (req, res) => {
    try {
      const { betIds, action, data } = req.body;
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!Array.isArray(betIds) || betIds.length === 0) {
        return res.status(400).json({ message: "betIds array is required" });
      }
      
      if (!action) {
        return res.status(400).json({ message: "action is required" });
      }
      
      const result = await storage.bulkUpdateBets(betIds, action, user.id, data);
      res.json(result);
    } catch (error) {
      console.error("Bulk update error:", error);
      res.status(400).json({ message: "Failed to perform bulk operation" });
    }
  });

  // Update bet notes (requires authentication)
  app.patch("/api/bets/:id/notes", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const bet = await storage.updateBetNotes(id, notes || "", user.id);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Update Google Sheets if user has connected sheets and bet has sheetRowId
      if (user?.googleSheetsId && user?.googleSheetsConnected && bet.sheetRowId) {
        try {
          const sheetResult = await googleSheetsService.updateBetInSheet(user, bet);
          // Update tokens if they were refreshed
          if (sheetResult.newTokens) {
            await storage.updateUser(user.id, {
              googleAccessToken: sheetResult.newTokens.accessToken,
              googleTokenExpiry: sheetResult.newTokens.expiresAt,
            });
          }
        } catch (error) {
          console.error("Failed to update bet notes in Google Sheets:", error);
          // Continue even if sheets update fails
        }
      }
      
      res.json(bet);
    } catch (error) {
      console.error("Update bet notes error:", error);
      res.status(400).json({ message: "Failed to update bet notes" });
    }
  });

  // Get bet history (requires authentication)
  app.get("/api/bets/:id/history", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Verify bet belongs to user
      const bet = await storage.getBet(id);
      if (!bet || bet.userId !== user.id) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      const history = await storage.getBetHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Get bet history error:", error);
      res.status(400).json({ message: "Failed to get bet history" });
    }
  });

  // Upload screenshot for processing
  app.post("/api/screenshots/upload", (req, res, next) => {
    upload.single('screenshot')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err.message);
        return res.status(400).json({ 
          message: err.message,
          type: 'file_validation_error'
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      console.log('Upload endpoint hit', { 
        hasFile: !!req.file,
        body: req.body,
        headers: req.headers['content-type']
      });
      
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ 
          message: "No file uploaded. Please select a valid image or PDF file.",
          type: 'no_file_error'
        });
      }

      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = user.id;
      
      console.log('Processing file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
      
      // Create screenshot record
      const screenshot = await storage.createScreenshot({
        userId,
        filename: req.file.originalname,
        filepath: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        processed: 0,
      });

      console.log('Screenshot record created:', screenshot.id);

      // Process with Gemini AI
      try {
        console.log('Reading file for AI processing...');
        const imageBuffer = fs.readFileSync(req.file.path);
        console.log('File read successfully, buffer size:', imageBuffer.length);
        
        // Check if Gemini API is properly configured
        if (!process.env.GEMINI_API_KEY) {
          console.warn('Gemini API key not configured, using mock data');
          // Return mock extracted data for testing
          const mockExtractedData = {
            sport: "NBA",
            event: "Lakers vs Warriors", 
            betType: "Moneyline",
            odds: "+150",
            stake: "25",
            potentialPayout: "62.50",
            confidence: 0.8
          };
          
          await storage.updateScreenshot(screenshot.id, {
            processed: 1,
            extractedData: JSON.stringify(mockExtractedData),
          });
          
          res.json({
            screenshot,
            extractedData: mockExtractedData,
            success: true,
            mode: 'mock' // Indicate this is mock data
          });
          return;
        }
        
        console.log('Calling Gemini AI...');
        try {
          const extractedData = await extractBetDataFromImage(imageBuffer, req.file.mimetype);
          console.log('Gemini AI extraction completed:', extractedData);
          
          if (await validateBetData(extractedData)) {
            await storage.updateScreenshot(screenshot.id, {
              processed: 1,
              extractedData: JSON.stringify(extractedData),
            });
            
            console.log('Bet data validated and screenshot updated');
            res.json({
              screenshot,
              extractedData,
              success: true,
              mode: 'ai'
            });
          } else {
            console.error('Bet data validation failed:', extractedData);
            await storage.updateScreenshot(screenshot.id, { processed: -1 });
            res.status(400).json({ 
              message: "Failed to extract valid bet data from screenshot. Please ensure the image contains clear betting information.",
              screenshot,
              type: 'validation_error'
            });
          }
        } catch (aiError) {
          console.error("Gemini API error:", aiError);
          console.log('Falling back to mock data due to AI error');
          
          // Fallback to mock data if AI fails
          const fallbackData = {
            sport: "Unknown Sport",
            event: "Please verify teams/event", 
            betType: "Please verify bet type",
            odds: "0",
            stake: "0",
            potentialPayout: "0",
            confidence: 0.1
          };
          
          await storage.updateScreenshot(screenshot.id, {
            processed: 1,
            extractedData: JSON.stringify(fallbackData),
          });
          
          res.json({
            screenshot,
            extractedData: fallbackData,
            success: true,
            mode: 'fallback',
            aiError: aiError.message,
            message: "Upload successful, but AI processing failed. Please review and edit the extracted data."
          });
        }
        
      } catch (error) {
        console.error("File processing error:", error);
        await storage.updateScreenshot(screenshot.id, { processed: -1 });
        res.status(500).json({ 
          message: `Failed to process screenshot: ${error.message}`,
          screenshot,
          type: 'processing_error'
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        message: `Failed to upload screenshot: ${error.message}`,
        type: 'server_error'
      });
    }
  });

  // Google OAuth flow initiation
  app.get("/api/auth/google", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const authUrl = googleSheetsService.getOAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("OAuth initiation error:", error);
      res.status(500).json({ 
        message: "Failed to initiate Google authorization. Please check Google OAuth configuration.",
        details: error.message 
      });
    }
  });

  // Google OAuth callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, error: oauthError, error_description } = req.query;
      
      // Handle OAuth errors from Google
      if (oauthError) {
        console.error("Google OAuth error:", oauthError, error_description);
        return res.status(400).send(`
          <html>
            <head>
              <title>Authorization Failed - BetSnap</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; color: white;">
              <div style="background: white; color: #333; border-radius: 10px; padding: 40px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <h2 style="color: #dc3545; margin-bottom: 20px;">Authorization Cancelled</h2>
                <p style="margin-bottom: 30px;">Google authorization was cancelled or failed.</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 30px;">${error_description || 'Please try again to connect your Google account.'}</p>
                <button onclick="notifyParentAndClose('GOOGLE_AUTH_CANCELLED')" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Close Window</button>
              </div>
              <script>
                function notifyParentAndClose(type) {
                  if (window.opener) {
                    const origin = '${process.env.REPL_URL || 'http://localhost:5000'}';
                    window.opener.postMessage({ type }, origin);
                  }
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
      }
      
      if (!code) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Authorization Failed - BetSnap</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; color: white;">
              <div style="background: white; color: #333; border-radius: 10px; padding: 40px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <h2 style="color: #dc3545; margin-bottom: 20px;">Authorization Failed</h2>
                <p style="margin-bottom: 30px;">No authorization code received from Google.</p>
                <button onclick="notifyParentAndClose('GOOGLE_AUTH_FAILED')" style="padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Close Window</button>
              </div>
              <script>
                function notifyParentAndClose(type) {
                  if (window.opener) {
                    const origin = '${process.env.REPL_URL || 'http://localhost:5000'}';
                    window.opener.postMessage({ type }, origin);
                  }
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
      }

      console.log("Processing Google OAuth callback with code:", code.substring(0, 20) + "...");

      // Exchange code for tokens
      const tokens = await googleSheetsService.handleOAuthCallback(code as string);
      
      console.log("Successfully obtained tokens, expires at:", tokens.expiresAt);
      
      res.send(`
        <html>
          <head>
            <title>Authorization Successful - BetSnap</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; color: white;">
            <div style="background: white; color: #333; border-radius: 10px; padding: 40px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <div style="background: #28a745; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px;">✓</div>
              <h2 style="color: #28a745; margin-bottom: 20px;">Authorization Successful!</h2>
              <p style="margin-bottom: 20px;">Your Google account has been connected successfully.</p>
              <p style="font-size: 14px; color: #666; margin-bottom: 30px;">Setting up your betting tracker now...</p>
              <div style="margin-bottom: 30px;">
                <div style="background: #f8f9fa; border-radius: 5px; padding: 10px; margin-bottom: 10px;">
                  <span style="font-size: 12px; color: #6c757d;">Status: </span>
                  <span id="status" style="font-size: 12px; color: #28a745;">Connecting...</span>
                </div>
              </div>
              <button onclick="window.close()" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;" disabled>Close Window</button>
            </div>
            <script>
              let statusStep = 0;
              const statusMessages = ['Connecting...', 'Authenticating...', 'Creating spreadsheet...', 'Complete!'];
              
              function updateStatus() {
                if (statusStep < statusMessages.length - 1) {
                  statusStep++;
                  document.getElementById('status').textContent = statusMessages[statusStep];
                  setTimeout(updateStatus, 800);
                } else {
                  document.querySelector('button').disabled = false;
                  document.querySelector('button').style.background = '#28a745';
                  document.querySelector('button').style.cursor = 'pointer';
                }
              }
              
              // Start status animation
              setTimeout(updateStatus, 500);
              
              // Post message to parent window with secure origin
              if (window.opener) {
                try {
                  const origin = '${process.env.REPL_URL || 'http://localhost:5000'}';
                  console.log('Posting message to origin:', origin);
                  window.opener.postMessage({ 
                    type: 'GOOGLE_AUTH_SUCCESS', 
                    tokens: ${JSON.stringify(tokens)} 
                  }, origin);
                } catch (e) {
                  console.error('Failed to post message:', e);
                }
              }
              
              // Auto-close after 5 seconds
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send(`
        <html>
          <head>
            <title>Authorization Failed - BetSnap</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; color: white;">
            <div style="background: white; color: #333; border-radius: 10px; padding: 40px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <h2 style="color: #dc3545; margin-bottom: 20px;">Authorization Failed</h2>
              <p style="margin-bottom: 20px;">Failed to complete Google authorization.</p>
              <p style="font-size: 14px; color: #666; margin-bottom: 30px;">${error.message}</p>
              <button onclick="notifyParentAndClose('GOOGLE_AUTH_ERROR')" style="padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Close Window</button>
            </div>
            <script>
              function notifyParentAndClose(type) {
                if (window.opener) {
                  const origin = '${process.env.REPL_URL || 'http://localhost:5000'}';
                  window.opener.postMessage({ type, error: '${error.message}' }, origin);
                }
                window.close();
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  // Complete Google Sheets setup after OAuth
  app.post("/api/sheets/complete-setup", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { accessToken, refreshToken, expiresAt } = req.body;
      
      if (!accessToken || !refreshToken) {
        return res.status(400).json({ message: "Missing OAuth tokens" });
      }

      // Update user with Google tokens
      const updatedUser = await storage.updateUser(user.id, {
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleTokenExpiry: new Date(expiresAt),
        googleSheetsConnected: 1,
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to save OAuth tokens" });
      }

      // Create the betting sheet
      const sheetResult = await googleSheetsService.createBetTrackingSheet(updatedUser);
      
      // Update user with sheet ID and any refreshed tokens
      const updateData: any = { googleSheetsId: sheetResult.sheetId };
      if (sheetResult.newTokens) {
        updateData.googleAccessToken = sheetResult.newTokens.accessToken;
        updateData.googleTokenExpiry = sheetResult.newTokens.expiresAt;
      }
      await storage.updateUser(user.id, updateData);
      
      // Sync existing bets to the new sheet
      const existingBets = await storage.getBetsByUser(user.id);
      if (existingBets.length > 0) {
        const syncResult = await googleSheetsService.syncExistingBets(updatedUser, existingBets);
        // Update tokens if they were refreshed during sync
        if (syncResult.newTokens) {
          await storage.updateUser(user.id, {
            googleAccessToken: syncResult.newTokens.accessToken,
            googleTokenExpiry: syncResult.newTokens.expiresAt,
          });
        }
      }
      
      res.json({ 
        sheetId: sheetResult.sheetId,
        message: "Google Sheets integration completed successfully",
        url: `https://docs.google.com/spreadsheets/d/${sheetResult.sheetId}`,
        syncedBets: existingBets.length,
      });
    } catch (error) {
      console.error("Sheets setup completion error:", error);
      res.status(500).json({ 
        message: "Failed to complete Google Sheets setup",
        details: error.message 
      });
    }
  });

  // Disconnect Google Sheets
  app.post("/api/sheets/disconnect", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.updateUser(user.id, {
        googleSheetsId: null,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleSheetsConnected: 0,
      });

      res.json({ message: "Google Sheets disconnected successfully" });
    } catch (error) {
      console.error("Sheets disconnect error:", error);
      res.status(500).json({ message: "Failed to disconnect Google Sheets" });
    }
  });

  // Manually sync existing bets to Google Sheets
  app.post("/api/sheets/sync-bets", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!user.googleSheetsId || !user.googleSheetsConnected) {
        return res.status(400).json({ message: "Google Sheets not connected" });
      }

      const existingBets = await storage.getBetsByUser(user.id);
      if (existingBets.length === 0) {
        return res.json({ message: "No bets to sync", syncedBets: 0 });
      }

      const syncResult = await googleSheetsService.syncExistingBets(user, existingBets);
      
      // Update tokens if they were refreshed during sync
      if (syncResult.newTokens) {
        await storage.updateUser(user.id, {
          googleAccessToken: syncResult.newTokens.accessToken,
          googleTokenExpiry: syncResult.newTokens.expiresAt,
        });
      }
      
      res.json({ 
        message: "Bets synced successfully",
        syncedBets: existingBets.length,
      });
    } catch (error) {
      console.error("Bet sync error:", error);
      res.status(500).json({ 
        message: "Failed to sync bets to Google Sheets",
        details: error.message 
      });
    }
  });

  // Get sheet templates
  app.get("/api/sheets/templates", async (req, res) => {
    try {
      const templates = googleSheetsService.getBetTrackingTemplate();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  // ============ BANKROLL MANAGEMENT ROUTES ============

  // Get all user bankrolls
  app.get("/api/bankrolls", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const bankrolls = await storage.getBankrollsByUser(user.id);
      res.json(bankrolls);
    } catch (error) {
      console.error("Get bankrolls error:", error);
      res.status(500).json({ message: "Failed to get bankrolls" });
    }
  });

  // Create new bankroll
  app.post("/api/bankrolls", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const validatedData = insertBankrollSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const bankroll = await storage.createBankroll(validatedData);
      res.json(bankroll);
    } catch (error) {
      console.error("Create bankroll error:", error);
      res.status(400).json({ message: "Invalid bankroll data" });
    }
  });

  // Get specific bankroll
  app.get("/api/bankrolls/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      res.json(bankroll);
    } catch (error) {
      console.error("Get bankroll error:", error);
      res.status(500).json({ message: "Failed to get bankroll" });
    }
  });

  // Update bankroll
  app.patch("/api/bankrolls/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const validatedUpdates = updateBankrollSchema.parse(req.body);
      
      const bankroll = await storage.updateBankroll(id, validatedUpdates, user.id);
      if (!bankroll) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      res.json(bankroll);
    } catch (error) {
      console.error("Update bankroll error:", error);
      res.status(400).json({ message: "Failed to update bankroll" });
    }
  });

  // Delete bankroll
  app.delete("/api/bankrolls/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const deleted = await storage.deleteBankroll(id, user.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      res.json({ message: "Bankroll deleted successfully" });
    } catch (error) {
      console.error("Delete bankroll error:", error);
      if (error.message.includes("associated bets")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete bankroll" });
    }
  });

  // Activate bankroll
  app.post("/api/bankrolls/:id/activate", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.activateBankroll(id, user.id);
      
      if (!bankroll) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      res.json(bankroll);
    } catch (error) {
      console.error("Activate bankroll error:", error);
      res.status(500).json({ message: "Failed to activate bankroll" });
    }
  });

  // Get bankroll balance
  app.get("/api/bankrolls/:id/balance", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const balance = await storage.getBankrollBalance(id);
      res.json({ balance });
    } catch (error) {
      console.error("Get bankroll balance error:", error);
      res.status(500).json({ message: "Failed to get bankroll balance" });
    }
  });

  // Get bankroll transactions
  app.get("/api/bankrolls/:id/transactions", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const transactions = await storage.getBankrollTransactions(id);
      res.json(transactions);
    } catch (error) {
      console.error("Get bankroll transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  // Create bankroll transaction
  app.post("/api/bankrolls/:id/transactions", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const validatedData = insertBankrollTransactionSchema.parse({
        ...req.body,
        bankrollId: id,
        userId: user.id,
      });
      
      const transaction = await storage.createBankrollTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(400).json({ message: "Invalid transaction data" });
    }
  });

  // Get bankroll goals
  app.get("/api/bankrolls/:id/goals", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const goals = await storage.getBankrollGoals(id);
      res.json(goals);
    } catch (error) {
      console.error("Get bankroll goals error:", error);
      res.status(500).json({ message: "Failed to get goals" });
    }
  });

  // Create bankroll goal
  app.post("/api/bankrolls/:id/goals", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const validatedData = insertBankrollGoalSchema.parse({
        ...req.body,
        bankrollId: id,
      });
      
      const goal = await storage.createBankrollGoal(validatedData);
      res.json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(400).json({ message: "Invalid goal data" });
    }
  });

  // Update bankroll goal
  app.patch("/api/bankrolls/:bankrollId/goals/:goalId", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { bankrollId, goalId } = req.params;
      const bankroll = await storage.getBankroll(bankrollId);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const validatedUpdates = updateBankrollGoalSchema.parse(req.body);
      const goal = await storage.updateBankrollGoal(goalId, validatedUpdates, user.id);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(400).json({ message: "Failed to update goal" });
    }
  });

  // Delete bankroll goal
  app.delete("/api/bankrolls/:bankrollId/goals/:goalId", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { bankrollId, goalId } = req.params;
      const bankroll = await storage.getBankroll(bankrollId);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const deleted = await storage.deleteBankrollGoal(goalId, user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Get bankroll analytics
  app.get("/api/bankrolls/:id/analytics", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      // Parse optional date range from query params
      const { dateFrom, dateTo } = req.query;
      const fromDate = dateFrom ? new Date(dateFrom as string) : undefined;
      const toDate = dateTo ? new Date(dateTo as string) : undefined;
      
      const analytics = await storage.getBankrollAnalytics(id, fromDate, toDate);
      res.json(analytics);
    } catch (error) {
      console.error("Get bankroll analytics error:", error);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Risk management helper endpoints
  app.get("/api/bankrolls/:id/risk/daily-limit", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const limitCheck = await storage.checkDailyLossLimit(id);
      res.json(limitCheck);
    } catch (error) {
      console.error("Daily limit check error:", error);
      res.status(500).json({ message: "Failed to check daily limit" });
    }
  });

  app.get("/api/bankrolls/:id/risk/weekly-limit", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const limitCheck = await storage.checkWeeklyLossLimit(id);
      res.json(limitCheck);
    } catch (error) {
      console.error("Weekly limit check error:", error);
      res.status(500).json({ message: "Failed to check weekly limit" });
    }
  });

  app.post("/api/bankrolls/:id/risk/kelly-bet-size", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const { winProbability, odds } = req.body;
      
      if (!winProbability || !odds) {
        return res.status(400).json({ message: "winProbability and odds are required" });
      }
      
      const kellyCalculation = await storage.calculateKellyBetSize(id, winProbability, odds);
      res.json(kellyCalculation);
    } catch (error) {
      console.error("Kelly calculation error:", error);
      res.status(500).json({ message: "Failed to calculate Kelly bet size" });
    }
  });

  app.get("/api/bankrolls/:id/risk/max-bet-size", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const maxBetSize = await storage.getMaxBetSize(id);
      res.json(maxBetSize);
    } catch (error) {
      console.error("Max bet size error:", error);
      res.status(500).json({ message: "Failed to get max bet size" });
    }
  });

  app.post("/api/bankrolls/:id/risk/validate-bet", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { id } = req.params;
      const bankroll = await storage.getBankroll(id);
      
      if (!bankroll || bankroll.userId !== user.id) {
        return res.status(404).json({ message: "Bankroll not found" });
      }
      
      const { stakeAmount } = req.body;
      
      if (!stakeAmount) {
        return res.status(400).json({ message: "stakeAmount is required" });
      }
      
      const validation = await storage.validateBetSize(id, parseFloat(stakeAmount));
      res.json(validation);
    } catch (error) {
      console.error("Bet validation error:", error);
      res.status(500).json({ message: "Failed to validate bet size" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
