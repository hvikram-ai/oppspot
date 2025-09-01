interface SocialProfile {
  platform: string
  profileUrl: string
  username?: string
  profileId?: string
  followers?: number
  following?: number
  posts?: number
  engagementRate?: number
  bio?: string
  profileImage?: string
  coverImage?: string
  verified?: boolean
  lastPostDate?: Date
  isActive?: boolean
}

interface SocialPost {
  postId: string
  postUrl: string
  content?: string
  mediaType?: 'text' | 'image' | 'video' | 'link'
  mediaUrls?: string[]
  hashtags?: string[]
  mentions?: string[]
  likes?: number
  comments?: number
  shares?: number
  views?: number
  postedAt?: Date
}

export class SocialMediaScraper {
  private readonly userAgent = 'Mozilla/5.0 (compatible; OppSpotBot/1.0)'

  // Main method to discover social profiles from a website
  async discoverSocialProfiles(websiteUrl: string): Promise<SocialProfile[]> {
    const profiles: SocialProfile[] = []
    
    try {
      // Scrape website for social links
      const response = await fetch(websiteUrl, {
        headers: { 'User-Agent': this.userAgent }
      })
      const html = await response.text()
      
      // Extract social media URLs
      const socialUrls = this.extractSocialUrls(html)
      
      // Process each social URL
      for (const [platform, url] of Object.entries(socialUrls)) {
        const profile = await this.getBasicProfile(platform, url)
        if (profile) {
          profiles.push(profile)
        }
      }
    } catch (error) {
      console.error('Error discovering social profiles:', error)
    }
    
    return profiles
  }

  // Extract social media URLs from HTML
  private extractSocialUrls(html: string): Record<string, string> {
    const urls: Record<string, string> = {}
    
    const patterns = {
      facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[A-Za-z0-9.]+/gi,
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/gi,
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/gi,
      linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9-]+/gi,
      youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|channel|user)\/[A-Za-z0-9_-]+/gi,
      tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/gi,
      pinterest: /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/[A-Za-z0-9_]+/gi
    }
    
    for (const [platform, pattern] of Object.entries(patterns)) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        // Clean and validate URL
        let url = matches[0]
        if (!url.startsWith('http')) {
          url = `https://${url}`
        }
        urls[platform] = url
      }
    }
    
    return urls
  }

  // Get basic profile information (without API keys)
  private async getBasicProfile(platform: string, url: string): Promise<SocialProfile | null> {
    try {
      const profile: SocialProfile = {
        platform,
        profileUrl: url,
        isActive: true
      }
      
      // Extract username from URL
      profile.username = this.extractUsername(platform, url)
      
      // Platform-specific basic scraping
      switch (platform) {
        case 'facebook':
          return await this.scrapeFacebookBasic(url, profile)
        case 'instagram':
          return await this.scrapeInstagramBasic(url, profile)
        case 'twitter':
          return await this.scrapeTwitterBasic(url, profile)
        case 'linkedin':
          return await this.scrapeLinkedInBasic(url, profile)
        case 'youtube':
          return await this.scrapeYouTubeBasic(url, profile)
        default:
          return profile
      }
    } catch (error) {
      console.error(`Error scraping ${platform}:`, error)
      return null
    }
  }

  // Extract username from social media URL
  private extractUsername(platform: string, url: string): string | undefined {
    const patterns: Record<string, RegExp> = {
      facebook: /facebook\.com\/([A-Za-z0-9.]+)/,
      instagram: /instagram\.com\/([A-Za-z0-9_.]+)/,
      twitter: /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/,
      linkedin: /linkedin\.com\/(?:company|in)\/([A-Za-z0-9-]+)/,
      youtube: /youtube\.com\/(?:c|channel|user)\/([A-Za-z0-9_-]+)/,
      tiktok: /tiktok\.com\/@([A-Za-z0-9_.]+)/,
      pinterest: /pinterest\.com\/([A-Za-z0-9_]+)/
    }
    
    const pattern = patterns[platform]
    if (pattern) {
      const match = url.match(pattern)
      return match ? match[1] : undefined
    }
    
    return undefined
  }

  // Basic Facebook scraping (limited without API)
  private async scrapeFacebookBasic(url: string, profile: SocialProfile): Promise<SocialProfile> {
    // Facebook heavily restricts scraping
    // This would need Facebook Graph API for real data
    profile.bio = 'Facebook profile (API required for details)'
    return profile
  }

  // Basic Instagram scraping (limited without API)
  private async scrapeInstagramBasic(url: string, profile: SocialProfile): Promise<SocialProfile> {
    // Instagram requires authentication for most data
    // This would need Instagram Basic Display API
    profile.bio = 'Instagram profile (API required for details)'
    return profile
  }

  // Basic Twitter/X scraping (limited without API)
  private async scrapeTwitterBasic(url: string, profile: SocialProfile): Promise<SocialProfile> {
    // Twitter has strict anti-scraping measures
    // This would need Twitter API v2
    profile.bio = 'Twitter/X profile (API required for details)'
    return profile
  }

  // Basic LinkedIn scraping (limited without API)
  private async scrapeLinkedInBasic(url: string, profile: SocialProfile): Promise<SocialProfile> {
    // LinkedIn blocks most scraping attempts
    // Could use Proxycurl API as done in linkedin/client.ts
    profile.bio = 'LinkedIn profile (API required for details)'
    return profile
  }

  // Basic YouTube scraping
  private async scrapeYouTubeBasic(url: string, profile: SocialProfile): Promise<SocialProfile> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent }
      })
      const html = await response.text()
      
      // Extract basic channel info from page metadata
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
      if (titleMatch) {
        profile.bio = titleMatch[1]
      }
      
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
      if (imageMatch) {
        profile.profileImage = imageMatch[1]
      }
      
      // Try to extract subscriber count (may not always work)
      const subscriberMatch = html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)
      if (subscriberMatch) {
        const subText = subscriberMatch[1]
        profile.followers = this.parseCount(subText)
      }
    } catch (error) {
      console.error('YouTube scraping error:', error)
    }
    
    return profile
  }

  // Parse follower/subscriber counts
  private parseCount(text: string): number {
    const cleanText = text.toLowerCase().replace(/[^0-9kmb.]/g, '')
    let multiplier = 1
    
    if (cleanText.includes('k')) {
      multiplier = 1000
    } else if (cleanText.includes('m')) {
      multiplier = 1000000
    } else if (cleanText.includes('b')) {
      multiplier = 1000000000
    }
    
    const number = parseFloat(cleanText.replace(/[kmb]/g, ''))
    return Math.round(number * multiplier)
  }

  // Calculate engagement rate
  calculateEngagementRate(likes: number, comments: number, shares: number, followers: number): number {
    if (followers === 0) return 0
    const totalEngagement = likes + comments + (shares * 2) // Weight shares more
    return (totalEngagement / followers) * 100
  }

  // Determine posting frequency
  determinePostingFrequency(posts: SocialPost[]): string {
    if (posts.length === 0) return 'rarely'
    
    const sortedPosts = posts.sort((a, b) => 
      (b.postedAt?.getTime() || 0) - (a.postedAt?.getTime() || 0)
    )
    
    const latestPost = sortedPosts[0].postedAt
    if (!latestPost) return 'rarely'
    
    const daysSinceLastPost = Math.floor(
      (Date.now() - latestPost.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceLastPost <= 1) return 'daily'
    if (daysSinceLastPost <= 7) return 'weekly'
    if (daysSinceLastPost <= 30) return 'monthly'
    return 'rarely'
  }

  // Check if profile is active
  isProfileActive(lastPostDate?: Date): boolean {
    if (!lastPostDate) return false
    
    const daysSinceLastPost = Math.floor(
      (Date.now() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    return daysSinceLastPost < 90 // Active if posted within 3 months
  }
}

// Social Media API Client (for platforms with APIs)
export class SocialMediaAPIClient {
  constructor(
    private apiKeys: {
      facebook?: string
      instagram?: string
      twitter?: string
      youtube?: string
      tiktok?: string
    } = {}
  ) {}

  // Facebook Graph API
  async getFacebookProfile(pageId: string): Promise<SocialProfile | null> {
    if (!this.apiKeys.facebook) {
      console.warn('Facebook API key not configured')
      return null
    }

    try {
      const fields = 'id,name,about,fan_count,followers_count,website,cover,picture'
      const url = `https://graph.facebook.com/v18.0/${pageId}?fields=${fields}&access_token=${this.apiKeys.facebook}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }
      
      return {
        platform: 'facebook',
        profileUrl: `https://facebook.com/${pageId}`,
        username: data.name,
        profileId: data.id,
        followers: data.followers_count || data.fan_count,
        bio: data.about,
        profileImage: data.picture?.data?.url,
        coverImage: data.cover?.source,
        isActive: true
      }
    } catch (error) {
      console.error('Facebook API error:', error)
      return null
    }
  }

  // YouTube Data API
  async getYouTubeChannel(channelId: string): Promise<SocialProfile | null> {
    if (!this.apiKeys.youtube) {
      console.warn('YouTube API key not configured')
      return null
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${this.apiKeys.youtube}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Channel not found')
      }
      
      const channel = data.items[0]
      
      return {
        platform: 'youtube',
        profileUrl: `https://youtube.com/channel/${channelId}`,
        username: channel.snippet.title,
        profileId: channelId,
        followers: parseInt(channel.statistics.subscriberCount),
        posts: parseInt(channel.statistics.videoCount),
        bio: channel.snippet.description,
        profileImage: channel.snippet.thumbnails.high.url,
        isActive: true
      }
    } catch (error) {
      console.error('YouTube API error:', error)
      return null
    }
  }

  // Twitter API v2 (requires OAuth 2.0)
  async getTwitterProfile(username: string): Promise<SocialProfile | null> {
    if (!this.apiKeys.twitter) {
      console.warn('Twitter API key not configured')
      return null
    }

    try {
      // This would require OAuth 2.0 Bearer Token
      const url = `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics,description,profile_image_url,verified`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKeys.twitter}`
        }
      })
      
      const data = await response.json()
      
      if (data.errors) {
        throw new Error(data.errors[0].message)
      }
      
      return {
        platform: 'twitter',
        profileUrl: `https://twitter.com/${username}`,
        username: username,
        profileId: data.data.id,
        followers: data.data.public_metrics.followers_count,
        following: data.data.public_metrics.following_count,
        posts: data.data.public_metrics.tweet_count,
        bio: data.data.description,
        profileImage: data.data.profile_image_url,
        verified: data.data.verified,
        isActive: true
      }
    } catch (error) {
      console.error('Twitter API error:', error)
      return null
    }
  }
}