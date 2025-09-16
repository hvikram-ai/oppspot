import * as cheerio from 'cheerio'

interface WebsiteData {
  title?: string
  description?: string
  keywords?: string[]
  about?: string
  services?: string[]
  products?: string[]
  emails?: string[]
  phones?: string[]
  socialLinks?: Record<string, string>
  addresses?: unknown[]
  businessHours?: any
  technologies?: string[]
  hasSsl?: boolean
  mobileFriendly?: boolean
  hasOnlineStore?: boolean
  paymentMethods?: string[]
  seoScore?: number
  structuredData?: any
  teamMembers?: Array<{
    name: string
    role?: string
    image?: string
    bio?: string
  }>
  testimonials?: Array<{
    author: string
    text: string
    rating?: number
  }>
}

export class WebsiteScraper {
  private readonly userAgent = 'Mozilla/5.0 (compatible; OppSpotBot/1.0; +https://oppspot.com/bot)'
  private readonly timeout = 10000 // 10 seconds

  async scrapeWebsite(url: string): Promise<WebsiteData> {
    try {
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        },
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)
      
      const data: WebsiteData = {
        hasSsl: url.startsWith('https://'),
      }

      // Extract basic meta information
      data.title = $('title').text().trim() || 
                   $('meta[property="og:title"]').attr('content') || 
                   $('meta[name="twitter:title"]').attr('content')

      data.description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="twitter:description"]').attr('content')

      const keywordsContent = $('meta[name="keywords"]').attr('content')
      if (keywordsContent) {
        data.keywords = keywordsContent.split(',').map(k => k.trim()).filter(Boolean)
      }

      // Extract structured data (Schema.org)
      const structuredDataScripts = $('script[type="application/ld+json"]')
      if (structuredDataScripts.length > 0) {
        try {
          const jsonLd = []
          structuredDataScripts.each((_, elem) => {
            try {
              const json = JSON.parse($(elem).html() || '{}')
              jsonLd.push(json)
            } catch (e) {
              // Invalid JSON, skip
            }
          })
          if (jsonLd.length > 0) {
            data.structuredData = jsonLd
            
            // Extract business hours from structured data
            const localBusiness = jsonLd.find(item => 
              item['@type'] === 'LocalBusiness' || 
              item['@type']?.includes('LocalBusiness')
            )
            if (localBusiness?.openingHoursSpecification) {
              data.businessHours = localBusiness.openingHoursSpecification
            }
          }
        } catch (e) {
          console.error('Error parsing structured data:', e)
        }
      }

      // Extract contact information
      data.emails = this.extractEmails(html)
      data.phones = this.extractPhones(html)
      data.socialLinks = this.extractSocialLinks($, html)

      // Extract about/services/products
      data.about = this.extractAboutContent($)
      data.services = this.extractServices($)
      data.products = this.extractProducts($)

      // Extract team members
      data.teamMembers = this.extractTeamMembers($)

      // Extract testimonials
      data.testimonials = this.extractTestimonials($)

      // Detect technologies
      data.technologies = this.detectTechnologies($, html)

      // Check mobile friendliness
      data.mobileFriendly = this.checkMobileFriendly($)

      // Check for e-commerce
      data.hasOnlineStore = this.detectEcommerce($, html)
      if (data.hasOnlineStore) {
        data.paymentMethods = this.extractPaymentMethods($, html)
      }

      // Calculate basic SEO score
      data.seoScore = this.calculateSeoScore($, data)

      return data
    } catch (error) {
      console.error('Website scraping error:', error)
      throw error
    }
  }

  private extractEmails(html: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const matches = html.match(emailRegex) || []
    // Filter out common false positives
    return [...new Set(matches)].filter(email => 
      !email.includes('example.com') &&
      !email.includes('your-email') &&
      !email.includes('email@') &&
      !email.endsWith('.png') &&
      !email.endsWith('.jpg')
    ).slice(0, 10) // Limit to 10 emails
  }

  private extractPhones(html: string): string[] {
    const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    const matches = html.match(phoneRegex) || []
    return [...new Set(matches)].filter(phone => 
      phone.length >= 10 && phone.length <= 20
    ).slice(0, 10)
  }

  private extractSocialLinks($: cheerio.CheerioAPI, html: string): Record<string, string> {
    const socialLinks: Record<string, string> = {}
    const platforms = {
      facebook: /facebook\.com\/[^\/\s"']+/i,
      instagram: /instagram\.com\/[^\/\s"']+/i,
      twitter: /(?:twitter|x)\.com\/[^\/\s"']+/i,
      linkedin: /linkedin\.com\/(?:company|in)\/[^\/\s"']+/i,
      youtube: /youtube\.com\/(?:c|channel|user)\/[^\/\s"']+/i,
      tiktok: /tiktok\.com\/@[^\/\s"']+/i,
      pinterest: /pinterest\.com\/[^\/\s"']+/i
    }

    // Check links
    $('a[href*="facebook.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="x.com"], a[href*="linkedin.com"], a[href*="youtube.com"], a[href*="tiktok.com"], a[href*="pinterest.com"]').each((_, elem) => {
      const href = $(elem).attr('href')
      if (href) {
        for (const [platform, regex] of Object.entries(platforms)) {
          if (regex.test(href) && !socialLinks[platform]) {
            socialLinks[platform] = href
          }
        }
      }
    })

    // Also check in text content for social URLs
    for (const [platform, regex] of Object.entries(platforms)) {
      if (!socialLinks[platform]) {
        const match = html.match(regex)
        if (match) {
          socialLinks[platform] = `https://${match[0]}`
        }
      }
    }

    return socialLinks
  }

  private extractAboutContent($: cheerio.CheerioAPI): string | undefined {
    // Common selectors for about content
    const selectors = [
      '#about',
      '.about',
      '[class*="about"]',
      'section:has(h1:contains("About")), section:has(h2:contains("About"))',
      'div:has(h1:contains("About")), div:has(h2:contains("About"))',
      '[id*="about-us"]',
      '[class*="about-us"]'
    ]

    for (const selector of selectors) {
      const element = $(selector).first()
      if (element.length) {
        const text = element.text().trim()
        if (text.length > 50 && text.length < 5000) {
          return text.replace(/\s+/g, ' ').substring(0, 1000)
        }
      }
    }

    // Fallback: look for meta description
    return $('meta[name="description"]').attr('content')
  }

  private extractServices($: cheerio.CheerioAPI): string[] {
    const services: string[] = []
    const selectors = [
      '#services li',
      '.services li',
      '[class*="service"] h3',
      '[class*="service"] h4',
      'section:has(h2:contains("Services")) li',
      'section:has(h2:contains("What We Do")) li'
    ]

    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        const text = $(elem).text().trim()
        if (text.length > 3 && text.length < 100) {
          services.push(text)
        }
      })
      if (services.length > 0) break
    }

    return [...new Set(services)].slice(0, 20)
  }

  private extractProducts($: cheerio.CheerioAPI): string[] {
    const products: string[] = []
    const selectors = [
      '.product-title',
      '.product-name',
      '[class*="product"] h3',
      '[class*="product"] h4',
      '.woocommerce-loop-product__title',
      '.product-item__title'
    ]

    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        const text = $(elem).text().trim()
        if (text.length > 3 && text.length < 100) {
          products.push(text)
        }
      })
      if (products.length > 0) break
    }

    return [...new Set(products)].slice(0, 20)
  }

  private extractTeamMembers($: cheerio.CheerioAPI): Array<{name: string, role?: string, image?: string, bio?: string}> {
    const team: Array<{name: string, role?: string, image?: string, bio?: string}> = []
    
    // Common team member selectors
    const selectors = [
      '.team-member',
      '[class*="team"] [class*="member"]',
      '.staff-member',
      '.person',
      'section:has(h2:contains("Team")) .member'
    ]

    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        const $member = $(elem)
        const member: Record<string, unknown> = {}
        
        // Extract name
        const nameSelectors = ['h3', 'h4', '.name', '[class*="name"]']
        for (const ns of nameSelectors) {
          const name = $member.find(ns).first().text().trim()
          if (name) {
            member.name = name
            break
          }
        }
        
        // Extract role
        const roleSelectors = ['.role', '.title', '.position', '[class*="role"]', '[class*="title"]']
        for (const rs of roleSelectors) {
          const role = $member.find(rs).first().text().trim()
          if (role && role !== member.name) {
            member.role = role
            break
          }
        }
        
        // Extract image
        const img = $member.find('img').first()
        if (img.length) {
          member.image = img.attr('src') || img.attr('data-src')
        }
        
        // Extract bio
        const bio = $member.find('p').first().text().trim()
        if (bio && bio.length > 20) {
          member.bio = bio.substring(0, 200)
        }
        
        if (member.name) {
          team.push(member)
        }
      })
      
      if (team.length > 0) break
    }

    return team.slice(0, 10)
  }

  private extractTestimonials($: cheerio.CheerioAPI): Array<{author: string, text: string, rating?: number}> {
    const testimonials: Array<{author: string, text: string, rating?: number}> = []
    
    const selectors = [
      '.testimonial',
      '.review',
      '[class*="testimonial"]',
      '[class*="review"]',
      'blockquote'
    ]

    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        const $testimonial = $(elem)
        const testimonial: Record<string, unknown> = {}
        
        // Extract text
        const text = $testimonial.find('p, .text, .content').first().text().trim() ||
                    $testimonial.text().trim()
        
        if (text && text.length > 20) {
          testimonial.text = text.substring(0, 500)
          
          // Extract author
          const authorSelectors = ['.author', '.name', 'cite', 'footer']
          for (const as of authorSelectors) {
            const author = $testimonial.find(as).first().text().trim()
            if (author && author !== text) {
              testimonial.author = author
              break
            }
          }
          
          // Extract rating (look for star ratings)
          const stars = $testimonial.find('[class*="star"]').length ||
                       $testimonial.find('.fa-star').length
          if (stars > 0) {
            testimonial.rating = Math.min(stars, 5)
          }
          
          if (testimonial.author || testimonial.text.length > 50) {
            testimonials.push(testimonial)
          }
        }
      })
      
      if (testimonials.length > 0) break
    }

    return testimonials.slice(0, 10)
  }

  private detectTechnologies($: cheerio.CheerioAPI, html: string): string[] {
    const technologies: string[] = []

    // Check meta generators
    const generator = $('meta[name="generator"]').attr('content')
    if (generator) technologies.push(generator)

    // Common technology indicators
    const techIndicators = {
      'WordPress': /wp-content|wordpress/i,
      'Shopify': /shopify|myshopify/i,
      'Wix': /wix\.com|wixsite/i,
      'Squarespace': /squarespace/i,
      'React': /react|_react/i,
      'Vue.js': /vue\.js|vuejs/i,
      'Angular': /angular/i,
      'jQuery': /jquery/i,
      'Bootstrap': /bootstrap/i,
      'Tailwind CSS': /tailwind/i,
      'Google Analytics': /google-analytics|gtag|ga\(/i,
      'Google Tag Manager': /googletagmanager/i,
      'Facebook Pixel': /fbevents\.js/i,
      'Cloudflare': /cloudflare/i,
      'WooCommerce': /woocommerce/i,
      'Magento': /magento/i,
      'Drupal': /drupal/i,
      'Joomla': /joomla/i
    }

    for (const [tech, regex] of Object.entries(techIndicators)) {
      if (regex.test(html)) {
        technologies.push(tech)
      }
    }

    return [...new Set(technologies)]
  }

  private checkMobileFriendly($: cheerio.CheerioAPI): boolean {
    // Check for viewport meta tag
    const viewport = $('meta[name="viewport"]').attr('content')
    if (!viewport) return false

    // Check if viewport includes width=device-width
    return viewport.includes('width=device-width')
  }

  private detectEcommerce($: cheerio.CheerioAPI, html: string): boolean {
    // Look for e-commerce indicators
    const indicators = [
      'add-to-cart',
      'shopping-cart',
      'checkout',
      'add_to_cart',
      'cart-button',
      'product-price',
      'woocommerce',
      'shopify',
      'bigcommerce',
      'magento'
    ]

    for (const indicator of indicators) {
      if ($(`[class*="${indicator}"]`).length > 0 || 
          $(`[id*="${indicator}"]`).length > 0 ||
          html.toLowerCase().includes(indicator)) {
        return true
      }
    }

    return false
  }

  private extractPaymentMethods($: cheerio.CheerioAPI, html: string): string[] {
    const methods: string[] = []
    
    const paymentIndicators = {
      'Visa': /visa/i,
      'Mastercard': /mastercard/i,
      'American Express': /american express|amex/i,
      'PayPal': /paypal/i,
      'Stripe': /stripe/i,
      'Apple Pay': /apple pay/i,
      'Google Pay': /google pay/i,
      'Venmo': /venmo/i,
      'Square': /square/i,
      'Afterpay': /afterpay/i,
      'Klarna': /klarna/i,
      'Bitcoin': /bitcoin|btc/i,
      'Ethereum': /ethereum|eth/i
    }

    // Check images for payment logos
    $('img').each((_, elem) => {
      const src = $(elem).attr('src') || ''
      const alt = $(elem).attr('alt') || ''
      const combined = `${src} ${alt}`.toLowerCase()
      
      for (const [method, regex] of Object.entries(paymentIndicators)) {
        if (regex.test(combined) && !methods.includes(method)) {
          methods.push(method)
        }
      }
    })

    // Also check in text
    const pageText = $.text().toLowerCase()
    for (const [method, regex] of Object.entries(paymentIndicators)) {
      if (regex.test(pageText) && !methods.includes(method)) {
        methods.push(method)
      }
    }

    return methods
  }

  private calculateSeoScore($: cheerio.CheerioAPI, data: WebsiteData): number {
    let score = 0
    const maxScore = 100

    // Title tag (15 points)
    if (data.title) {
      score += 10
      if (data.title.length >= 30 && data.title.length <= 60) {
        score += 5
      }
    }

    // Meta description (15 points)
    if (data.description) {
      score += 10
      if (data.description.length >= 120 && data.description.length <= 160) {
        score += 5
      }
    }

    // Keywords (5 points)
    if (data.keywords && data.keywords.length > 0) {
      score += 5
    }

    // SSL (10 points)
    if (data.hasSsl) {
      score += 10
    }

    // Mobile friendly (15 points)
    if (data.mobileFriendly) {
      score += 15
    }

    // Headings structure (10 points)
    const h1Count = $('h1').length
    if (h1Count === 1) {
      score += 5
    }
    if ($('h2').length > 0) {
      score += 5
    }

    // Images with alt text (10 points)
    const images = $('img')
    const imagesWithAlt = $('img[alt]')
    if (images.length > 0 && imagesWithAlt.length / images.length >= 0.8) {
      score += 10
    }

    // Structured data (10 points)
    if (data.structuredData) {
      score += 10
    }

    // Social links (5 points)
    if (data.socialLinks && Object.keys(data.socialLinks).length > 0) {
      score += 5
    }

    // Content quality (5 points)
    if (data.about && data.about.length > 100) {
      score += 5
    }

    return Math.min(score, maxScore)
  }
}