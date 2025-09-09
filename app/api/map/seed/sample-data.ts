// Sample UK and Ireland businesses with real coordinates
export const sampleBusinesses = [
  // London businesses
  {
    name: 'TechHub London',
    description: 'Leading technology incubator and co-working space',
    latitude: 51.5250,
    longitude: -0.0875,
    address: {
      street: '20 Ropemaker Street',
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      postal_code: 'EC2Y 9AR'
    },
    categories: ['Technology', 'Coworking', 'Startup'],
    website: 'https://techhub.com',
    phone_numbers: ['+44 20 7490 0764'],
    emails: ['info@techhub.com']
  },
  {
    name: 'Canary Wharf Group',
    description: 'Major business district and financial center',
    latitude: 51.5054,
    longitude: -0.0235,
    address: {
      street: 'One Canada Square',
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      postal_code: 'E14 5AB'
    },
    categories: ['Real Estate', 'Financial Services'],
    website: 'https://group.canarywharf.com',
    phone_numbers: ['+44 20 7418 2000'],
    emails: ['contact@canarywharf.com']
  },
  {
    name: 'Revolut Ltd',
    description: 'Digital banking and financial technology company',
    latitude: 51.5049,
    longitude: -0.0197,
    address: {
      street: '7 Westferry Circus',
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      postal_code: 'E14 4HD'
    },
    categories: ['FinTech', 'Banking', 'Technology'],
    website: 'https://revolut.com',
    phone_numbers: ['+44 20 3322 8352'],
    emails: ['support@revolut.com']
  },
  
  // Manchester businesses
  {
    name: 'MediaCityUK',
    description: 'Digital and media enterprise zone',
    latitude: 53.4723,
    longitude: -2.2975,
    address: {
      street: 'MediaCity UK',
      city: 'Salford',
      state: 'Greater Manchester',
      country: 'United Kingdom',
      postal_code: 'M50 2EQ'
    },
    categories: ['Media', 'Technology', 'Broadcasting'],
    website: 'https://mediacityuk.co.uk',
    phone_numbers: ['+44 161 886 5000'],
    emails: ['info@mediacityuk.co.uk']
  },
  {
    name: 'Manchester Science Park',
    description: 'Science and technology park hosting innovative businesses',
    latitude: 53.4631,
    longitude: -2.2413,
    address: {
      street: 'Pencroft Way',
      city: 'Manchester',
      state: 'Greater Manchester',
      country: 'United Kingdom',
      postal_code: 'M15 6JJ'
    },
    categories: ['Science', 'Technology', 'Research'],
    website: 'https://mspl.co.uk',
    phone_numbers: ['+44 161 226 8917'],
    emails: ['enquiries@mspl.co.uk']
  },
  
  // Edinburgh businesses
  {
    name: 'Edinburgh Tech Hub',
    description: 'Scotland\'s premier technology business center',
    latitude: 55.9533,
    longitude: -3.1883,
    address: {
      street: '1 Summerhall',
      city: 'Edinburgh',
      state: 'Scotland',
      country: 'United Kingdom',
      postal_code: 'EH9 1PL'
    },
    categories: ['Technology', 'Innovation', 'Startup'],
    website: 'https://edinburghtechhub.com',
    phone_numbers: ['+44 131 560 1444'],
    emails: ['hello@edinburghtechhub.com']
  },
  {
    name: 'Royal Bank of Scotland HQ',
    description: 'Major UK banking and financial services company',
    latitude: 55.9501,
    longitude: -3.1187,
    address: {
      street: 'Gogarburn',
      city: 'Edinburgh',
      state: 'Scotland',
      country: 'United Kingdom',
      postal_code: 'EH12 1HQ'
    },
    categories: ['Banking', 'Financial Services'],
    website: 'https://rbs.com',
    phone_numbers: ['+44 131 523 2007'],
    emails: ['customer.service@rbs.co.uk']
  },
  
  // Dublin businesses
  {
    name: 'Google Dublin',
    description: 'European headquarters of Google',
    latitude: 53.3398,
    longitude: -6.2363,
    address: {
      street: 'Barrow Street',
      city: 'Dublin',
      state: 'Dublin',
      country: 'Ireland',
      postal_code: 'D04 V4X7'
    },
    categories: ['Technology', 'Software', 'Internet'],
    website: 'https://google.com',
    phone_numbers: ['+353 1 436 1000'],
    emails: ['dublin@google.com']
  },
  {
    name: 'Facebook Ireland',
    description: 'International headquarters of Meta',
    latitude: 53.3315,
    longitude: -6.2285,
    address: {
      street: '4 Grand Canal Square',
      city: 'Dublin',
      state: 'Dublin',
      country: 'Ireland',
      postal_code: 'D02 X525'
    },
    categories: ['Technology', 'Social Media', 'Software'],
    website: 'https://facebook.com',
    phone_numbers: ['+353 1 653 5400'],
    emails: ['ireland@fb.com']
  },
  {
    name: 'Trinity College Innovation Hub',
    description: 'University innovation and entrepreneurship center',
    latitude: 53.3438,
    longitude: -6.2546,
    address: {
      street: 'College Green',
      city: 'Dublin',
      state: 'Dublin',
      country: 'Ireland',
      postal_code: 'D02 PN40'
    },
    categories: ['Education', 'Research', 'Innovation'],
    website: 'https://tcd.ie',
    phone_numbers: ['+353 1 896 1000'],
    emails: ['innovation@tcd.ie']
  },
  
  // Birmingham businesses
  {
    name: 'Birmingham Tech Quarter',
    description: 'Technology and digital business district',
    latitude: 52.4814,
    longitude: -1.8998,
    address: {
      street: 'Aston Science Park',
      city: 'Birmingham',
      state: 'West Midlands',
      country: 'United Kingdom',
      postal_code: 'B7 4BJ'
    },
    categories: ['Technology', 'Business Park', 'Innovation'],
    website: 'https://birminghamtechquarter.com',
    phone_numbers: ['+44 121 250 3741'],
    emails: ['info@birminghamtech.com']
  },
  {
    name: 'HSBC UK Birmingham',
    description: 'Major banking headquarters',
    latitude: 52.4778,
    longitude: -1.9090,
    address: {
      street: '1 Centenary Square',
      city: 'Birmingham',
      state: 'West Midlands',
      country: 'United Kingdom',
      postal_code: 'B1 1HQ'
    },
    categories: ['Banking', 'Financial Services'],
    website: 'https://hsbc.co.uk',
    phone_numbers: ['+44 121 455 8545'],
    emails: ['birmingham@hsbc.com']
  },
  
  // Glasgow businesses
  {
    name: 'Glasgow Science Centre',
    description: 'Science and technology education center',
    latitude: 55.8585,
    longitude: -4.2960,
    address: {
      street: '50 Pacific Quay',
      city: 'Glasgow',
      state: 'Scotland',
      country: 'United Kingdom',
      postal_code: 'G51 1EA'
    },
    categories: ['Science', 'Education', 'Technology'],
    website: 'https://glasgowsciencecentre.org',
    phone_numbers: ['+44 141 420 5000'],
    emails: ['info@glasgowsciencecentre.org']
  },
  {
    name: 'Morgan Stanley Glasgow',
    description: 'Technology and operations center',
    latitude: 55.8607,
    longitude: -4.2572,
    address: {
      street: '122 Waterloo Street',
      city: 'Glasgow',
      state: 'Scotland',
      country: 'United Kingdom',
      postal_code: 'G2 7AP'
    },
    categories: ['Financial Services', 'Technology'],
    website: 'https://morganstanley.com',
    phone_numbers: ['+44 141 245 8000'],
    emails: ['glasgow@morganstanley.com']
  },
  
  // Cardiff businesses
  {
    name: 'Cardiff Bay Innovation Centre',
    description: 'Business incubation and innovation hub',
    latitude: 51.4654,
    longitude: -3.1660,
    address: {
      street: 'Tredegar Street',
      city: 'Cardiff',
      state: 'Wales',
      country: 'United Kingdom',
      postal_code: 'CF10 5EH'
    },
    categories: ['Innovation', 'Business Services', 'Startup'],
    website: 'https://cardiffinnovation.com',
    phone_numbers: ['+44 29 2041 7296'],
    emails: ['info@cardiffinnovation.com']
  },
  
  // Belfast businesses
  {
    name: 'Titanic Quarter',
    description: 'Regeneration and business district',
    latitude: 54.6050,
    longitude: -5.9041,
    address: {
      street: 'Queens Road',
      city: 'Belfast',
      state: 'Northern Ireland',
      country: 'United Kingdom',
      postal_code: 'BT3 9DT'
    },
    categories: ['Business District', 'Technology', 'Innovation'],
    website: 'https://titanic-quarter.com',
    phone_numbers: ['+44 28 9076 6000'],
    emails: ['info@titanic-quarter.com']
  },
  {
    name: 'Deloitte Belfast',
    description: 'Professional services and consulting',
    latitude: 54.5973,
    longitude: -5.9301,
    address: {
      street: '19 Bedford Street',
      city: 'Belfast',
      state: 'Northern Ireland',
      country: 'United Kingdom',
      postal_code: 'BT2 7EJ'
    },
    categories: ['Consulting', 'Professional Services', 'Technology'],
    website: 'https://deloitte.co.uk',
    phone_numbers: ['+44 28 9032 2861'],
    emails: ['belfast@deloitte.co.uk']
  },
  
  // Cork businesses
  {
    name: 'Apple Cork',
    description: 'European operations center for Apple',
    latitude: 51.8464,
    longitude: -8.4933,
    address: {
      street: 'Hollyhill Industrial Estate',
      city: 'Cork',
      state: 'Cork',
      country: 'Ireland',
      postal_code: 'T23 YK84'
    },
    categories: ['Technology', 'Manufacturing', 'Electronics'],
    website: 'https://apple.com',
    phone_numbers: ['+353 21 428 4000'],
    emails: ['cork@apple.com']
  },
  {
    name: 'Cork Institute of Technology',
    description: 'Leading technology and research institution',
    latitude: 51.8858,
    longitude: -8.5339,
    address: {
      street: 'Rossa Avenue',
      city: 'Cork',
      state: 'Cork',
      country: 'Ireland',
      postal_code: 'T12 P928'
    },
    categories: ['Education', 'Research', 'Technology'],
    website: 'https://cit.ie',
    phone_numbers: ['+353 21 432 6100'],
    emails: ['info@cit.ie']
  },
  
  // Leeds businesses
  {
    name: 'Leeds Digital Hub',
    description: 'Center for digital businesses and startups',
    latitude: 53.7997,
    longitude: -1.5492,
    address: {
      street: '20 York Place',
      city: 'Leeds',
      state: 'West Yorkshire',
      country: 'United Kingdom',
      postal_code: 'LS1 2EX'
    },
    categories: ['Technology', 'Digital', 'Startup'],
    website: 'https://leedsdigitalhub.com',
    phone_numbers: ['+44 113 234 1035'],
    emails: ['hello@leedsdigitalhub.com']
  }
]