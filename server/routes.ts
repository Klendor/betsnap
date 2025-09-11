import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBetSchema, insertScreenshotSchema, registerSchema, loginSchema } from "@shared/schema";
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
      if (user?.googleSheetsId) {
        try {
          await googleSheetsService.addBetToSheet(user.googleSheetsId, bet);
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

  // Update bet status (requires authentication)
  app.patch("/api/bets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Verify bet belongs to user
      const existingBet = await storage.getBet(id);
      if (!existingBet || existingBet.userId !== user.id) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      const bet = await storage.updateBet(id, updates);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      res.json(bet);
    } catch (error) {
      res.status(400).json({ message: "Failed to update bet" });
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

  // Create Google Sheets integration (requires authentication)
  app.post("/api/sheets/create", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const sheetId = await googleSheetsService.createBetTrackingSheet(user.email);
      
      await storage.updateUser(user.id, { googleSheetsId: sheetId });
      
      res.json({ 
        sheetId,
        message: "Google Sheet created successfully",
        url: `https://docs.google.com/spreadsheets/d/${sheetId}`,
      });
    } catch (error) {
      console.error("Sheets creation error:", error);
      res.status(500).json({ message: "Failed to create Google Sheet" });
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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
