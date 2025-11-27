/**
 * Google Search Console Service
 * Handles all interactions with Google Search Console API
 */

const { google } = require('googleapis');
const SearchConsoleSettings = require('../models/searchConsoleSettings');

class SearchConsoleService {
  constructor() {
    this.oauth2Client = null;
    this.searchConsole = null;
    this.settings = null;
  }

  /**
   * Initialize OAuth 2.0 client
   */
  async initialize() {
    try {
      this.settings = await SearchConsoleSettings.getOrCreateSettings();
      
      if (!this.settings.isOAuthConfigured()) {
        throw new Error('OAuth credentials not configured');
      }

      this.oauth2Client = new google.auth.OAuth2(
        this.settings.clientId,
        this.settings.clientSecret,
        this.settings.redirectUri
      );

      // Set credentials if available
      if (this.settings.isAuthenticated()) {
        this.oauth2Client.setCredentials({
          access_token: this.settings.accessToken,
          refresh_token: this.settings.refreshToken,
          expiry_date: this.settings.tokenExpiry?.getTime(),
        });

        // Refresh token if expired
        if (this.settings.isTokenExpired()) {
          await this.refreshAccessToken();
        }
      }

      this.searchConsole = google.searchconsole({
        version: 'v1',
        auth: this.oauth2Client,
      });

      return true;
    } catch (error) {
      console.error('Error initializing Search Console service:', error);
      throw error;
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl() {
    if (!this.settings || !this.settings.isOAuthConfigured()) {
      throw new Error('OAuth credentials not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Update settings with tokens
      this.settings.accessToken = tokens.access_token;
      this.settings.refreshToken = tokens.refresh_token;
      this.settings.tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
      this.settings.isActive = true;
      await this.settings.save();

      // Set credentials
      this.oauth2Client.setCredentials(tokens);

      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      if (!this.settings.refreshToken) {
        throw new Error('No refresh token available');
      }

      this.oauth2Client.setCredentials({
        refresh_token: this.settings.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update settings
      this.settings.accessToken = credentials.access_token;
      this.settings.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
      await this.settings.save();

      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Get list of verified sites
   */
  async getSites() {
    try {
      await this.initialize();
      
      const response = await this.searchConsole.sites.list();
      return response.data.siteEntry || [];
    } catch (error) {
      console.error('Error fetching sites:', error);
      throw error;
    }
  }

  /**
   * Get search analytics data
   */
  async getSearchAnalytics(siteUrl, options = {}) {
    try {
      await this.initialize();

      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        endDate = new Date().toISOString().split('T')[0], // Today
        dimensions = ['query', 'page', 'country', 'device', 'date'],
        rowLimit = 1000,
        startRow = 0,
      } = options;

      const request = {
        requestBody: {
          startDate,
          endDate,
          dimensions: Array.isArray(dimensions) ? dimensions : [dimensions],
          rowLimit,
          startRow,
        },
      };

      const response = await this.searchConsole.searchanalytics.query(request, {
        siteUrl: siteUrl,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      throw error;
    }
  }

  /**
   * Submit sitemap to Search Console
   */
  async submitSitemap(siteUrl, sitemapUrl) {
    try {
      await this.initialize();

      await this.searchConsole.sitemaps.submit({
        siteUrl: siteUrl,
        feedpath: sitemapUrl,
      });

      // Update settings with submitted sitemap
      if (!this.settings.sitemapUrls.includes(sitemapUrl)) {
        this.settings.sitemapUrls.push(sitemapUrl);
        await this.settings.save();
      }

      return { success: true, message: 'Sitemap submitted successfully' };
    } catch (error) {
      console.error('Error submitting sitemap:', error);
      throw error;
    }
  }

  /**
   * List submitted sitemaps
   */
  async listSitemaps(siteUrl) {
    try {
      await this.initialize();

      const response = await this.searchConsole.sitemaps.list({
        siteUrl: siteUrl,
      });

      return response.data.sitemap || [];
    } catch (error) {
      console.error('Error listing sitemaps:', error);
      throw error;
    }
  }

  /**
   * Get sitemap details
   */
  async getSitemap(siteUrl, feedpath) {
    try {
      await this.initialize();

      const response = await this.searchConsole.sitemaps.get({
        siteUrl: siteUrl,
        feedpath: feedpath,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting sitemap:', error);
      throw error;
    }
  }

  /**
   * Delete sitemap
   */
  async deleteSitemap(siteUrl, feedpath) {
    try {
      await this.initialize();

      await this.searchConsole.sitemaps.delete({
        siteUrl: siteUrl,
        feedpath: feedpath,
      });

      // Remove from settings
      this.settings.sitemapUrls = this.settings.sitemapUrls.filter(url => url !== feedpath);
      await this.settings.save();

      return { success: true, message: 'Sitemap deleted successfully' };
    } catch (error) {
      console.error('Error deleting sitemap:', error);
      throw error;
    }
  }

  /**
   * Auto-submit sitemap if enabled
   */
  async autoSubmitSitemap(siteUrl, sitemapUrl) {
    try {
      await this.initialize();

      if (!this.settings.autoSubmitSitemap) {
        return { success: false, message: 'Auto-submit is disabled' };
      }

      return await this.submitSitemap(siteUrl, sitemapUrl);
    } catch (error) {
      console.error('Error auto-submitting sitemap:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SearchConsoleService();

