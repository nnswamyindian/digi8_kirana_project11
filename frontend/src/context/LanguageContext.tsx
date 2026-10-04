import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'te' | 'en';

interface TranslationDictionary {
  // Brand & Slogan
  appName: string;
  tagline: string;
  companyName: string;
  subTitle: string;
  
  // Navigation
  navHome: string;
  navFeatures: string;
  navHowItWorks: string;
  navPricing: string;
  navFaq: string;
  navDemoStore: string;
  navRegisterStore: string;
  navStoreLogin: string;
  navSuperAdmin: string;
  navCheckStatus: string;
  navBackToLanding: string;
  
  // Landing Page
  heroBadge: string;
  heroHeadline1: string;
  heroHeadline2: string;
  heroDescription: string;
  heroCtaStart: string;
  heroCtaDemo: string;
  metricActiveStores: string;
  metricMonthlyGmv: string;
  metricBillingSpeed: string;
  metricCloudUptime: string;
  
  // Features
  featuresTitle: string;
  featuresSubtitle: string;
  featPosTitle: string;
  featPosDesc: string;
  featLooseTitle: string;
  featLooseDesc: string;
  featStorefrontTitle: string;
  featStorefrontDesc: string;
  featGpsTitle: string;
  featGpsDesc: string;
  featUpiTitle: string;
  featUpiDesc: string;
  featDomainTitle: string;
  featDomainDesc: string;
  
  // How it works
  hiwTitle: string;
  hiwSubtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;
  step5Title: string;
  step5Desc: string;
  step6Title: string;
  step6Desc: string;
  
  // Pricing
  pricingTitle: string;
  pricingSubtitle: string;
  monthlyBilling: string;
  yearlyBilling: string;
  perMonth: string;
  choosePlan: string;
  savePercent: string;
  mostPopular: string;
  
  // Storefront & Cart
  cart: string;
  items: string;
  total: string;
  subtotal: string;
  freeDeliveryAbove: string;
  openNow: string;
  storeClosed: string;
  searchPlaceholder: string;
  customerLogin: string;
  myOrders: string;
  signOut: string;
  staffLogin: string;
  riderLogin: string;
  addToCart: string;
  outOfStock: string;
  inStock: string;
  mrp: string;
  price: string;
  allProducts: string;
  looseItems: string;
  dealsOffers: string;
  categories: string;
  checkout: string;
  payOnDelivery: string;
  orderSuccess: string;
  trackOrder: string;
  demoStoreNotice: string;
  
  // Admin & POS
  dashboard: string;
  posBilling: string;
  orders: string;
  liveFleet: string;
  payments: string;
  deliveryAreas: string;
  productsMenu: string;
  inventoryMenu: string;
  purchasesMenu: string;
  customersMenu: string;
  staffMenu: string;
  reportsMenu: string;
  customDomainMenu: string;
  planBillingMenu: string;
  helpSupportMenu: string;
  companyControlCenter: string;
  settingsMenu: string;
  logout: string;
  todaySales: string;
  totalOrders: string;
  grossProfit: string;
  lowStockItems: string;
  recentOrders: string;
  quickActions: string;
  newSale: string;
  scanBarcode: string;
  cashReceived: string;
  balanceReturn: string;
  printReceipt: string;
  completeSale: string;
  
  // Platform Administration
  platformAdmin: string;
  platformDashboard: string;
  platformStores: string;
  platformApplications: string;
  platformSubscriptions: string;
  platformPayments: string;
  platformProjects: string;
  platformReports: string;
  platformDomains: string;
  platformUsers: string;
  platformDatabase: string;
  platformSettings: string;
  platformAuditLogs: string;
  platformSupport: string;
  platformSystemStatus: string;
  adminViewStore: string;
  exitStoreView: string;
  storeContext: string;
  allStoresPlatformMode: string;

  // Language switcher
  languageName: string;
  switchToLang: string;
}

const translations: Record<Language, TranslationDictionary> = {
  te: {
    appName: 'మన కిరాణా కొట్టు',
    tagline: 'కిరాణా మరియు సూపర్ మార్కెట్ డిజిటల్ మేనేజ్మెంట్ ప్లాట్‌ఫారమ్',
    companyName: 'డిజి8 సొల్యూషన్స్',
    subTitle: 'భారతీయ కిరాణా మరియు రిటైల్ స్టోర్ల కోసం పూర్తి డిజిటల్ సిస్టమ్',
    
    // Navigation
    navHome: 'హోమ్',
    navFeatures: 'ప్రత్యేకతలు',
    navHowItWorks: 'ఎలా పనిచేస్తుంది',
    navPricing: 'ధరల వివరాలు',
    navFaq: 'సందేహాలు (FAQ)',
    navDemoStore: 'డెమో స్టోర్ చూడండి',
    navRegisterStore: 'మీ దుకాణాన్ని నమోదు చేయండి',
    navStoreLogin: 'దుకాణం లాగిన్',
    navSuperAdmin: 'సూపర్ అడ్మిన్ పోర్టల్',
    navCheckStatus: 'దరఖాస్తు స్థితి',
    navBackToLanding: 'వెబ్‌సైట్‌కి తిరిగి వెళ్ళండి',
    
    // Landing Page
    heroBadge: 'భారతీయ రిటైలర్ల కోసం సరికొత్త కిరాణా క్లౌడ్ సిస్టమ్',
    heroHeadline1: 'మీ కిరాణా కొట్టు వ్యాపారాన్ని',
    heroHeadline2: 'వేగంగా, సులభంగా నిర్వహించండి!',
    heroDescription: 'హై-స్పీడ్ POS బిల్లింగ్, బార్‌కోడ్ స్కానింగ్, వదులుగా ఉండే సరుకుల తూకం, ఇన్వెంటరీ రాడార్, డైనమిక్ UPI QR కోడ్, లైవ్ డెలివరీ ట్రాకింగ్ మరియు కస్టమర్ ఖాతా లెడ్జర్ — అన్నీ ఒకే ఆధునిక ప్లాట్‌ఫారమ్‌లో.',
    heroCtaStart: 'దుకాణాన్ని ప్రారంభించండి',
    heroCtaDemo: 'నమూనా (డెమో) కొట్టు చూడండి',
    metricActiveStores: 'యాక్టివ్ దుకాణాలు',
    metricMonthlyGmv: 'నెలవారీ వ్యాపారం',
    metricBillingSpeed: 'కౌంటర్ బిల్లింగ్ వేగం',
    metricCloudUptime: 'క్లౌడ్ సర్వర్ సమయం',
    
    // Features
    featuresTitle: 'కిరాణా దుకాణాల కోసం ప్రత్యేకంగా రూపొందించబడింది',
    featuresSubtitle: 'ఆఫ్‌లైన్ బిల్లింగ్ నుంచి ఆన్‌లైన్ అమ్మకాల వరకు కావాల్సిన అన్ని సౌకర్యాలు.',
    featPosTitle: 'హై-స్పీడ్ POS బిల్లింగ్',
    featPosDesc: 'శబ్ద సంకేతంతో బార్‌కోడ్ స్కానింగ్, క్యాషియర్ రాయితీలు, మేనేజర్ పిన్ ఆమోదం మరియు 58mm/80mm థర్మల్ ప్రింటింగ్ రశీదులు.',
    featLooseTitle: 'వదులు సరుకులు & తూకం స్కేల్',
    featLooseDesc: 'కందిపప్పు, బియ్యం, గోధుమపిండి, డ్రై ఫ్రూట్స్ తూకం (250గ్రా, 500గ్రా, 1.25కిలో) ప్రకారం ఖచ్చితమైన లైవ్ ధర లెక్కింపు.',
    featStorefrontTitle: 'ఆన్‌లైన్ స్టోర్‌ఫ్రంట్',
    featStorefrontDesc: 'లైవ్ స్టాక్ సూచికలు, డెలివరీ ప్రాంతాల పరిశీలన మరియు వేగవంతమైన ఆర్డరింగ్ సిస్టమ్‌తో మీ కస్టమర్ల కోసం ఆధునిక వెబ్‌సైట్.',
    featGpsTitle: 'లైవ్ డెలివరీ రైడర్ రాడార్',
    featGpsDesc: 'డెలివరీ బాయ్‌ల కేటాయింపు, లైవ్ GPS మ్యాప్ లొకేషన్, ఇంటి వద్ద నగదు వసూలు (COD) మరియు షిఫ్ట్ హ్యాండోవర్ ఆమోదం.',
    featUpiTitle: 'డైనమిక్ NPCI UPI QR & ఆన్‌లైన్ పేమెంట్స్',
    featUpiDesc: 'మీ దుకాణ VPA కి లింక్ చేయబడిన బిల్-ఖచ్చితమైన డైనమిక్ UPI QR కోడ్‌లు, Razorpay మరియు కార్డు పేమెంట్లు.',
    featDomainTitle: 'సొంత బ్రాండ్ డొమైన్',
    featDomainDesc: 'మీ సొంత వెబ్ అడ్రస్ (ఉదా: royalkirana.in) ని ఉచిత SSL సర్టిఫికెట్ మరియు ఆధునిక రంగులతో అనుసంధానించండి.',
    
    // How it works
    hiwTitle: '6 సులభ దశల్లో మీ దుకాణాన్ని ప్రారంభించండి',
    hiwSubtitle: 'సులువైన ఆన్‌బోర్డింగ్ ప్రక్రియ — కొద్ది నిమిషాల్లో ప్రత్యక్షం.',
    step1Title: '01. దుకాణ వివరాలు నమోదు',
    step1Desc: 'దుకాణం పేరు, మొబైల్ నంబర్, పిన్ మరియు అడ్రస్ వివరాలతో దరఖాస్తు సమర్పించండి.',
    step2Title: '02. సంస్థ ఆమోదం',
    step2Desc: 'మా నిపుణుల బృందం మీ వివరాలను పరిశీలించి దరఖాస్తును త్వరగా ఆమోదిస్తుంది.',
    step3Title: '03. ప్లాన్ ఎంపిక',
    step3Desc: 'స్టార్టర్, ప్రొఫెషనల్, బిజినెస్ లేదా ఎంటర్‌ప్రైజ్ ప్లాన్‌లలో సరైనది ఎంచుకోండి.',
    step4Title: '04. ప్లాట్‌ఫారమ్ రుసుము చెల్లింపు',
    step4Desc: 'సురక్షితమైన ఆన్‌లైన్ లేదా UPI ద్వారా సబ్‌స్క్రిప్షన్ చెల్లించి స్టోర్‌ను యాక్టివేట్ చేయండి.',
    step5Title: '05. సరుకులు & సిబ్బంది సెటప్',
    step5Desc: 'సరుకుల జాబితాను జోడించండి, క్యాషియర్ ఖాతాలు మరియు ప్రింటర్‌ను కాన్ఫిగర్ చేయండి.',
    step6Title: '06. అమ్మకాలు ప్రారంభించండి',
    step6Desc: 'కౌంటర్ వద్ద హై-స్పీడ్ బిల్లింగ్ మరియు ఆన్‌లైన్ ఆర్డర్లను వెంటనే ప్రారంభించండి.',
    
    // Pricing
    pricingTitle: 'పారదర్శకమైన SaaS ధరల ప్రణాళికలు',
    pricingSubtitle: 'ఎలాంటి దాగి ఉన్న కమీషన్లు లేవు. పూర్తి ఫీచర్ల ప్రవేశం.',
    monthlyBilling: 'నెలవారీ చెల్లింపు',
    yearlyBilling: 'వార్షిక చెల్లింపు',
    perMonth: 'నెలకి',
    choosePlan: 'ఎంచుకోండి',
    savePercent: '17% ఆదా',
    mostPopular: 'అత్యంత ప్రజాదరణ పొందినది',
    
    // Storefront & Cart
    cart: 'కార్ట్',
    items: 'వస్తువులు',
    total: 'మొత్తం',
    subtotal: 'ఉప మొత్తం',
    freeDeliveryAbove: 'ఉచిత డెలివరీ ఆఫర్',
    openNow: 'ఇప్పుడు తెరిచి ఉంది',
    storeClosed: 'ప్రస్తుతం మూసివేయబడింది',
    searchPlaceholder: 'బాస్మతి బియ్యం, కందిపప్పు, నూనె, పంచదార, మసాలాలు వెతకండి...',
    customerLogin: 'కస్టమర్ లాగిన్',
    myOrders: 'నా ఆర్డర్లు',
    signOut: 'లాగ్ అవుట్',
    staffLogin: 'సిబ్బంది లాగిన్',
    riderLogin: 'డెలివరీ రైడర్',
    addToCart: 'కార్ట్‌కు చేర్చు',
    outOfStock: 'స్టాక్ అయిపోయింది',
    inStock: 'స్టాక్ అందుబాటులో ఉంది',
    mrp: 'MRP',
    price: 'ధర',
    allProducts: 'అన్ని సరుకులు',
    looseItems: 'వదులు సరుకులు (తూకం)',
    dealsOffers: 'రాయితీలు & ఆఫర్లు',
    categories: 'వర్గాలు',
    checkout: 'చెల్లింపు ప్రక్రియ (Checkout)',
    payOnDelivery: 'సరుకులు అందినప్పుడు చెల్లించండి (COD)',
    orderSuccess: 'ఆర్డర్ విజయవంతంగా పూర్తయింది!',
    trackOrder: 'ఆర్డర్ ట్రాకింగ్',
    demoStoreNotice: 'డెమో స్టోర్‌ఫ్రంట్: మీరు మన కిరాణా కొట్టు లైవ్ కస్టమర్ ఆర్డర్ మరియు డెలివరీ ప్రక్రియను పరిశీలిస్తున్నారు.',
    
    // Admin & POS
    dashboard: 'డాష్‌బోర్డ్',
    posBilling: 'POS బిల్లింగ్ కౌంటర్',
    orders: 'ఆర్డర్ల నిర్వహణ',
    liveFleet: 'లైవ్ ఫ్లీట్ రాడార్',
    payments: 'చెల్లింపులు & హ్యాండోవర్',
    deliveryAreas: 'డెలివరీ ప్రాంతాలు',
    productsMenu: 'సరుకుల జాబితా (Products)',
    inventoryMenu: 'ఇన్వెంటరీ & స్టాక్',
    purchasesMenu: 'కొనుగోళ్లు & రశీదులు',
    customersMenu: 'కస్టమర్లు & ఖాతా పుస్తకం',
    staffMenu: 'సిబ్బంది & అనుమతులు',
    reportsMenu: 'నివేదికలు & విశ్లేషణ',
    customDomainMenu: 'కస్టమ్ డొమైన్',
    planBillingMenu: 'ప్లాన్ & బిల్లింగ్',
    helpSupportMenu: 'సహాయం & మద్దతు',
    companyControlCenter: 'కంపెనీ కంట్రోల్ సెంటర్',
    settingsMenu: 'సెట్టింగ్‌లు & హార్డ్‌వేర్',
    logout: 'నిష్క్రమించు (Logout)',
    todaySales: 'నేటి మొత్తం అమ్మకాలు',
    totalOrders: 'ఆర్డర్ల సంఖ్య',
    grossProfit: 'స్థూల లాభం',
    lowStockItems: 'తక్కువ స్టాక్ ఉన్న సరుకులు',
    recentOrders: 'ఇటీవలి ఆర్డర్లు',
    quickActions: 'త్వరిత చర్యలు',
    newSale: 'కొత్త బిల్లింగ్',
    scanBarcode: 'బార్‌కోడ్ స్కాన్ చేయండి',
    cashReceived: 'స్వీకరించిన నగదు',
    balanceReturn: 'తిరిగి ఇవ్వాల్సిన చిల్లర',
    printReceipt: 'రశీదు ప్రింట్ చేయండి',
    completeSale: 'బిల్ పూర్తి చేయండి',
    
    // Platform Administration
    platformAdmin: 'ప్లాట్‌ఫారమ్ అడ్మినిస్ట్రేషన్',
    platformDashboard: 'ప్లాట్‌ఫారమ్ డాష్‌బోర్డ్',
    platformStores: 'దుకాణాలు (Stores)',
    platformApplications: 'స్టోర్ దరఖాస్తులు',
    platformSubscriptions: 'సబ్‌స్క్రిప్షన్‌లు',
    platformPayments: 'ప్లాట్‌ఫారమ్ చెల్లింపులు',
    platformProjects: 'కంపెనీ ప్రాజెక్ట్‌లు',
    platformReports: 'ప్లాట్‌ఫారమ్ నివేదికలు',
    platformDomains: 'డొమైన్‌ల నిర్వహణ',
    platformUsers: 'యూజర్లు & అనుమతులు',
    platformDatabase: 'డేటాబేస్ నిర్వహణ',
    platformSettings: 'ప్లాట్‌ఫారమ్ సెట్టింగ్‌లు',
    platformAuditLogs: 'ఆడిట్ లాగ్‌లు',
    platformSupport: 'సపోర్ట్ & టిక్కెట్లు',
    platformSystemStatus: 'సిస్టమ్ స్థితి',
    adminViewStore: 'అడ్మిన్ వ్యూ — స్టోర్ కంట్రోల్ సెంటర్',
    exitStoreView: 'స్టోర్ వ్యూ నుండి నిష్క్రమించు',
    storeContext: 'స్టోర్ కంటెక్స్ట్',
    allStoresPlatformMode: '🌐 అన్ని దుకాణాలు (ప్లాట్‌ఫారమ్ మోడ్)',

    // Language switcher
    languageName: 'తెలుగు',
    switchToLang: 'Switch to English'
  },
  en: {
    appName: 'Mana Kirana Kottu',
    tagline: 'Complete Digital Management Platform for Kirana & Grocery Stores',
    companyName: 'Digi8 Solutions',
    subTitle: 'Modern Omnichannel Operating Cloud for Indian Kiranas',
    
    // Navigation
    navHome: 'Home',
    navFeatures: 'Features',
    navHowItWorks: 'How It Works',
    navPricing: 'Pricing',
    navFaq: 'FAQ',
    navDemoStore: 'View Sample Store',
    navRegisterStore: 'Register Your Store',
    navStoreLogin: 'Store Login',
    navSuperAdmin: 'Super Admin Portal',
    navCheckStatus: 'Check Status',
    navBackToLanding: 'Back to Platform Landing',
    
    // Landing Page
    heroBadge: 'Next-Generation Indian Retail Grocery Cloud',
    heroHeadline1: 'Run Your Kirana Store',
    heroHeadline2: 'Smarter, Faster & Everywhere.',
    heroDescription: 'High-speed POS billing, barcode scanning, loose items weighing, real-time inventory, dynamic UPI QR, live rider GPS delivery tracking, customer khata ledger, and custom domains — all in one modern platform.',
    heroCtaStart: 'Register Your Store',
    heroCtaDemo: 'View Sample Store',
    metricActiveStores: 'Active Stores',
    metricMonthlyGmv: 'Monthly GMV',
    metricBillingSpeed: 'Counter Billing',
    metricCloudUptime: 'Cloud Uptime',
    
    // Features
    featuresTitle: 'Engineered for Indian Grocery Operations',
    featuresSubtitle: 'Everything a modern Kirana or multi-store supermarket needs to operate offline and sell online.',
    featPosTitle: 'High-Speed POS Billing',
    featPosDesc: 'Scan barcodes with audio feedback, apply cashier discounts up to 5%, trigger Manager PIN approval for larger discounts, and print 58mm/80mm thermal receipts.',
    featLooseTitle: 'Loose Items & Weight Scale',
    featLooseDesc: 'Sell unpolished pulses, rice, flours, and dry fruits by exact weight (250g, 500g, 1.25kg) with instant dynamic price calculations.',
    featStorefrontTitle: 'Customer Online Storefront',
    featStorefrontDesc: 'A modern e-commerce storefront for your customers with live stock indicators, delivery radius verification, and instant cart checkout.',
    featGpsTitle: 'Live Fleet Radar & GPS Tracking',
    featGpsDesc: 'Assign deliveries to your store riders, watch real-time coordinates, track doorstep cash collections, and approve shift cash handovers.',
    featUpiTitle: 'NPCI Dynamic UPI & Razorpay',
    featUpiDesc: 'Generate bill-exact UPI QR codes directly encoded with your store VPA, or accept debit/credit cards and netbanking with HMAC security.',
    featDomainTitle: 'White-Label & Custom Domains',
    featDomainDesc: 'Connect your brand\'s domain (e.g. royalkirana.in) with automated DNS verification and dedicated brand color palettes.',
    
    // How it works
    hiwTitle: 'How to Launch in 6 Easy Steps',
    hiwSubtitle: 'Simple onboarding process — live in minutes.',
    step1Title: '01. Register Your Store',
    step1Desc: 'Fill in store name, mobile number, PIN, shop address, and business category.',
    step2Title: '02. Company Review & Approval',
    step2Desc: 'Our operations team validates your location details and approves your application.',
    step3Title: '03. Choose Your Plan',
    step3Desc: 'Pick the ideal tier: Starter, Professional, Business, or Enterprise.',
    step4Title: '04. Make Platform Payment',
    step4Desc: 'Settle your subscription invoice online via Razorpay or direct UPI.',
    step5Title: '05. Setup Catalog & Staff',
    step5Desc: 'Add products, configure cashier credentials, and connect your printer.',
    step6Title: '06. Go Live with Custom Domain',
    step6Desc: 'Link your own web address and begin billing counter & online sales.',
    
    // Pricing
    pricingTitle: 'Transparent SaaS Pricing',
    pricingSubtitle: 'No hidden transaction commissions. Full feature access.',
    monthlyBilling: 'Monthly Billing',
    yearlyBilling: 'Annual Billing',
    perMonth: ' / month',
    choosePlan: 'Choose',
    savePercent: 'Save 17%',
    mostPopular: 'MOST POPULAR',
    
    // Storefront & Cart
    cart: 'Cart',
    items: 'items',
    total: 'Total',
    subtotal: 'Subtotal',
    freeDeliveryAbove: 'Free Home Delivery above',
    openNow: 'Open Now',
    storeClosed: 'Store Currently Closed',
    searchPlaceholder: 'Search basmati rice, toor dal, sugar, oil, spices...',
    customerLogin: 'Customer Login',
    myOrders: 'My Orders',
    signOut: 'Sign Out',
    staffLogin: 'Staff Login',
    riderLogin: 'Rider',
    addToCart: 'Add to Cart',
    outOfStock: 'Out of Stock',
    inStock: 'In Stock',
    mrp: 'MRP',
    price: 'Price',
    allProducts: 'All Products',
    looseItems: 'Loose Weight Items',
    dealsOffers: 'Deals & Offers',
    categories: 'Categories',
    checkout: 'Proceed to Checkout',
    payOnDelivery: 'Pay on Delivery (Cash / UPI)',
    orderSuccess: 'Order Placed Successfully!',
    trackOrder: 'Track Order',
    demoStoreNotice: 'DEMO STOREFRONT: Experiencing live customer grocery order & delivery workflow on Mana Kirana Kottu',
    
    // Admin & POS
    dashboard: 'Dashboard',
    posBilling: 'POS Billing',
    orders: 'Orders',
    liveFleet: 'Live Fleet Radar',
    payments: 'Payments & Handover',
    deliveryAreas: 'Delivery Areas',
    productsMenu: 'Products',
    inventoryMenu: 'Inventory',
    purchasesMenu: 'Purchases & Stock',
    customersMenu: 'Customers & Khata',
    staffMenu: 'Staff & Roles',
    reportsMenu: 'Reports & Analytics',
    customDomainMenu: 'Custom Domain',
    planBillingMenu: 'Plan & Billing',
    helpSupportMenu: 'Help & Support',
    companyControlCenter: 'Company Control Center',
    settingsMenu: 'Settings & Hardware',
    logout: 'Logout',
    todaySales: "Today's Sales",
    totalOrders: 'Orders Count',
    grossProfit: 'Gross Profit',
    lowStockItems: 'Low Stock Items',
    recentOrders: 'Recent Orders',
    quickActions: 'Quick Actions',
    newSale: 'New Sale',
    scanBarcode: 'Scan Barcode',
    cashReceived: 'Cash Received',
    balanceReturn: 'Change to Return',
    printReceipt: 'Print Receipt',
    completeSale: 'Complete Sale',
    
    // Platform Administration
    platformAdmin: 'Platform Administration',
    platformDashboard: 'Platform Dashboard',
    platformStores: 'Stores',
    platformApplications: 'Store Applications',
    platformSubscriptions: 'Subscriptions',
    platformPayments: 'Platform Payments',
    platformProjects: 'Company Projects',
    platformReports: 'Platform Reports',
    platformDomains: 'Domains',
    platformUsers: 'Users & Access',
    platformDatabase: 'Database Management',
    platformSettings: 'Platform Settings',
    platformAuditLogs: 'Audit Logs',
    platformSupport: 'Support Tickets',
    platformSystemStatus: 'System Status',
    adminViewStore: 'ADMIN VIEW — STORE COMMAND CENTER',
    exitStoreView: 'Exit Store View',
    storeContext: 'Store Context',
    allStoresPlatformMode: '🌐 All Stores (Platform Mode)',

    // Language switcher
    languageName: 'English',
    switchToLang: 'తెలుగులోకి మార్చండి'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return (localStorage.getItem('mkk_language') as Language) || 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mkk_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'te' ? 'en' : 'te');
  };

  useEffect(() => {
    // Set html lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
